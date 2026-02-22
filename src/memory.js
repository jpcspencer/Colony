// memory.js — persistent knowledge storage

const fs = require('fs');
const path = require('path');
const { Finding } = require('./db');

const DATA_DIR = path.join(process.cwd(), 'data');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge-graph.json');

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function extractConfidence(verdict, finding) {
  const text = `${verdict} ${finding}`.toLowerCase();
  const numMatch = text.match(/(?:confidence|score)[:\s]*(\d{1,3})/i) || text.match(/(\d{1,3})\s*\/\s*100/);
  if (numMatch) return parseInt(numMatch[1], 10);
  if (text.includes('high')) return 80;
  if (text.includes('medium') || text.includes('moderate')) return 50;
  if (text.includes('low')) return 25;
  return null;
}

function extractDomainTags(thread) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'been', 'into', 'which', 'their', 'there', 'about', 'would', 'could', 'should', 'will', 'can', 'may', 'might']);
  const words = thread.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
  return [...new Set(words.filter((w) => w.length > 3 && !stopWords.has(w)))];
}

function saveFinding(finding) {
  const { thread, finding: fullFinding, verdict, runId, citations } = finding;
  const findingSummary = typeof fullFinding === 'string' ? fullFinding.slice(0, 500) : String(fullFinding).slice(0, 500);
  const confidenceScore = extractConfidence(verdict, fullFinding);
  const domainTags = extractDomainTags(thread);
  const timestamp = new Date().toISOString();

  const entry = {
    thread,
    findingSummary,
    verdict,
    confidenceScore,
    domainTags,
    timestamp,
    runId,
    sources: Array.isArray(citations) ? citations : [], // full verified citation objects (verificationStatus, verificationNote)
  };

  ensureDataDir();
  const existing = loadMemory();
  existing.push(entry);
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(existing, null, 2), 'utf8');

  new Finding({
    thread: entry.thread,
    agent: 'explorer',
    findingSummary: entry.findingSummary,
    sources: entry.sources,
    confidenceScore: entry.confidenceScore,
    runId: entry.runId,
    domain: (entry.domainTags || []).join(', ')
  }).save().catch(err => console.error('DB save error:', err));
}

function loadMemory() {
  ensureDataDir();
  if (!fs.existsSync(KNOWLEDGE_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(KNOWLEDGE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function scoreRelevance(thread, entry) {
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'have', 'has', 'been', 'into', 'which', 'their', 'there', 'about', 'would', 'could', 'should', 'will', 'can', 'may', 'might']);
  const keywords = thread.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const searchText = `${entry.thread ?? ''} ${entry.findingSummary ?? ''}`.toLowerCase();
  return keywords.filter((kw) => searchText.includes(kw)).length;
}

function queryMemory(domain) {
  const memory = loadMemory();
  const domainLower = domain.toLowerCase();
  const filtered = memory.filter(
    (entry) =>
      entry.domainTags?.some((tag) => tag.includes(domainLower) || domainLower.includes(tag)) ||
      entry.thread?.toLowerCase().includes(domainLower)
  );
  return filtered
    .map((entry) => ({ entry, score: scoreRelevance(domain, entry) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ entry }) => entry);
}

module.exports = { saveFinding, loadMemory, queryMemory };
