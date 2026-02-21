// agents/explorer.js — investigates a research thread

const fetch = require('node-fetch');
const { XMLParser } = require('fast-xml-parser');

async function braveSearch(thread, goal) {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    console.log('⚠️  [EXPLORER] BRAVE_API_KEY not set — skipping web search');
    return null;
  }

  const query = `${thread} ${goal}`.trim();
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Subscription-Token': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Brave API returned ${response.status}`);
    }

    const data = await response.json();
    const results = data.web?.results ?? [];

    return results.slice(0, 5).map((r) => ({
      title: r.title ?? '',
      description: r.description ?? '',
      url: r.url ?? '',
    }));
  } catch (err) {
    console.log(`⚠️  [EXPLORER] Brave search failed: ${err.message} — falling back to training knowledge`);
    return null;
  }
}

async function arxivSearch(thread, goal) {
  const query = `${thread} ${goal}`.trim().replace(/\s+/g, '+');
  const searchQuery = `all:${query}+AND+submittedDate:[202301010000+TO+202512312359]`;
  const url = `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&max_results=3&sortBy=submittedDate&sortOrder=descending`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`arXiv API returned ${response.status}`);
    }

    const xml = await response.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);
    const feed = parsed?.feed;
    const entries = feed?.entry;
    const entryList = Array.isArray(entries) ? entries : entries ? [entries] : [];

    return entryList.slice(0, 3).map((entry) => {
      const title = typeof entry.title === 'string' ? entry.title : entry.title?.['#text'] ?? entry.title ?? '';
      const summary = typeof entry.summary === 'string' ? entry.summary : entry.summary?.['#text'] ?? entry.summary ?? '';
      const authors = (() => {
        const a = entry.author;
        if (!a) return [];
        const list = Array.isArray(a) ? a : [a];
        return list.map((auth) => (typeof auth === 'string' ? auth : auth?.name ?? '')).filter(Boolean);
      })();
      const links = entry.link;
      const linkList = Array.isArray(links) ? links : links ? [links] : [];
      const altLink = linkList.find((l) => l['@_rel'] === 'alternate' || l.rel === 'alternate');
      const url = altLink?.['@_href'] ?? altLink?.href ?? entry.id ?? '';

      return {
        title: title.trim(),
        authors: authors.join(', '),
        abstract: summary.trim(),
        url: typeof url === 'string' ? url : '',
      };
    });
  } catch (err) {
    console.log(`⚠️  [EXPLORER] arXiv search failed: ${err.message} — skipping academic papers`);
    return [];
  }
}

async function semanticScholarSearch(thread, goal) {
  const query = `${thread} ${goal}`.trim();
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=3&fields=title,authors,abstract,year,externalIds,openAccessPdf`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Colony-Research-Agent/0.5' }
    });
    if (!response.ok) {
      throw new Error(`Semantic Scholar API returned ${response.status}`);
    }
    const data = await response.json();
    const papers = data.data ?? [];
    return papers.slice(0, 3).map((p) => ({
      title: p.title ?? '',
      authors: p.authors?.map(a => a.name).join(', ') ?? '',
      abstract: p.abstract ?? '',
      url: p.openAccessPdf?.url ?? `https://www.semanticscholar.org/paper/${p.paperId}`,
      year: p.year ?? ''
    }));
  } catch (err) {
    console.log(`⚠️  [EXPLORER] Semantic Scholar search failed: ${err.message}`);
    return [];
  }
}

function extractCitations(searchResults, arxivPapers) {
  const citations = [];
  if (searchResults) {
    for (const r of searchResults) {
      if (r.url) citations.push({ title: r.title, url: r.url, source: 'web' });
    }
  }
  if (arxivPapers) {
    for (const p of arxivPapers) {
      if (p.url) citations.push({ title: p.title, url: p.url, source: 'arxiv' });
    }
  }
  return citations;
}

async function explorer(thread, goal, memory, client, priorFindings = []) {
  console.log(`[WEB SEARCH] Searching for: ${thread}`);

  const sessionContext = memory.length > 0
    ? `\n\nPRIOR FINDINGS THIS SESSION:\n${memory.map(m => `- ${m.thread}: ${m.finding.slice(0, 200)}...`).join('\n')}`
    : '';

  const persistentContext = priorFindings.length > 0
    ? `\n\nPRIOR COLONY KNOWLEDGE (from previous sessions):\n${priorFindings.map(f => `- Thread: ${f.thread}\n  Summary: ${f.findingSummary}\n  Confidence: ${f.confidenceScore ?? 'unknown'}\n  Run: ${f.runId}`).join('\n\n')}\n\nBuild on this prior knowledge. Do not repeat what is already established. If your new findings contradict anything above, flag the contradiction explicitly.`
    : '';

  let arxivPapers = [];
  const [searchResults, arxivResult] = await Promise.all([
    braveSearch(thread, goal),
    arxivSearch(thread, goal),
  ]);

  if (!arxivResult || arxivResult.length === 0) {
    console.log(`📚 [EXPLORER] arXiv returned no results — falling back to Semantic Scholar`);
    arxivPapers = await semanticScholarSearch(thread, goal);
    if (arxivPapers.length > 0) {
      console.log(`📚 [EXPLORER] Semantic Scholar returned ${arxivPapers.length} paper(s)`);
    }
  } else {
    arxivPapers = arxivResult;
  }

  const webSources = searchResults && searchResults.length > 0
    ? `\n\nWEB SOURCES:\n${searchResults.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.description}\n   URL: ${r.url}`).join('\n\n')}`
    : '';

  const academicPapers = arxivPapers && arxivPapers.length > 0
    ? `\n\nACADEMIC PAPERS:\n${arxivPapers.map((r, i) => `${i + 1}. **${r.title}**\n   Authors: ${r.authors}\n   Abstract: ${r.abstract}\n   URL: ${r.url}`).join('\n\n')}`
    : '';

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a Colony Explorer Agent — a rigorous researcher investigating a specific thread.

Overall research goal: "${goal}"
Your assigned thread: "${thread}"${sessionContext}${persistentContext}${webSources}${academicPapers}

Investigate this thread thoroughly. Produce a detailed finding that includes:
1. Key facts and insights discovered
2. Any surprising or non-obvious connections
3. Open questions or gaps in knowledge
4. Confidence level in your findings (low/medium/high)

When WEB SOURCES or ACADEMIC PAPERS are provided above, cite them by name and URL where they support your findings. Be specific and substantive. This will be reviewed by a Critic Agent.`
    }]
  });

  const citations = extractCitations(searchResults, arxivPapers);
  console.log(`📎 [MEMORY] Citations extracted: ${JSON.stringify(citations)}`);
  return {
    text: response.content[0].text,
    citations
  };
}

module.exports = { explorer };
