// memory.js — persistent knowledge storage

const fs = require('fs');
const path = require('path');

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
  const { thread, finding: fullFinding, verdict, runId } = finding;
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
  };

  ensureDataDir();
  const existing = loadMemory();
  existing.push(entry);
  fs.writeFileSync(KNOWLEDGE_FILE, JSON.stringify(existing, null, 2), 'utf8');
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

function queryMemory(domain) {
  const memory = loadMemory();
  const domainLower = domain.toLowerCase();
  return memory.filter(
    (entry) =>
      entry.domainTags?.some((tag) => tag.includes(domainLower) || domainLower.includes(tag)) ||
      entry.thread?.toLowerCase().includes(domainLower)
  );
}

module.exports = { saveFinding, loadMemory, queryMemory };
