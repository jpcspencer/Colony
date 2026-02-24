# Colony

### Research that argues with itself.

Colony is a recursive peer-reviewed AI research platform. Not a chatbot. Not a search engine. A system of six named agents that autonomously explore a research goal, critique each other's findings, verify citations, and synthesize a final report grounded in real sources. Over time, it builds a persistent knowledge graph that compounds across sessions.

**Live at [usecolony.app](https://usecolony.app)**

---

## The Core Idea

Every other AI tool answers questions. Colony explores domains.

Most AI research tools make one pass — query in, answer out. Colony runs an adversarial loop. A dedicated Critic agent stress-tests every finding before it reaches the Synthesizer. A Verifier checks whether cited sources actually say what they claim. The result is a conclusion that's been argued over, not just generated.

And unlike stateless chat tools, Colony remembers. Every run builds the Atlas — a persistent knowledge graph that compounds across sessions. A Colony that has researched a domain for weeks has mapped contradictions and built structured knowledge that doesn't exist anywhere else.

---

## The Six Agents

| Agent | Role |
|-------|------|
| 🌱 **Seeder** | Maps the research goal into 3–7 distinct exploration threads — not variations, genuinely different angles |
| 🔍 **Explorer** | Researches each thread using real web search and academic sources, injecting prior Atlas knowledge before each run |
| ⚖️ **Critic** | Peer-reviews every finding. Scores confidence 0–100, flags weak sources and logical gaps, sends the colony back in if evidence is insufficient |
| 🔬 **Verifier** | Fetches every cited URL and checks whether the source actually supports the claim. Flags dead links and hallucinated attributions |
| 🧬 **Synthesizer** | Reads the entire colony memory and writes a final report with a plain-language TL;DR and full layered analysis — flagging what's known, probable, and uncertain |
| 📁 **Memory** | Saves every verified finding to the Atlas. Every run makes future runs smarter |

The Explorer and Critic are the recursive core. Explorer finds, Critic tears apart, Explorer goes deeper. This adversarial loop is what separates Colony from single-pass research tools.

---

## Features

- **Recursive research loop** — configurable depth, adversarial by design
- **Real web search** — Brave Search API fires on every Explorer call
- **Academic sources** — Semantic Scholar integration for peer-reviewed papers
- **Citation verification** — Verifier fetches and validates every source
- **Persistent Atlas** — shared knowledge graph that compounds across all sessions
- **Private Codex** — personal research archive, saved and searchable
- **Shareable syntheses** — every completed run gets a public URL
- **Soul documents** — each agent has an identity document defining how it thinks, not just what it does
- **Dark academia aesthetic** — because research tools should feel serious

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Intelligence | Anthropic API (Claude Sonnet) |
| Web search | Brave Search API |
| Academic sources | Semantic Scholar API |
| Web server | Express.js with SSE streaming |
| Database | MongoDB Atlas |
| Auth | JWT |
| Deployment | Railway |

---

## Self-Hosting

```bash
git clone https://github.com/jpcspencer/Colony
cd Colony
npm install
```

Create a `.env` file:

```
ANTHROPIC_API_KEY=your_key
BRAVE_API_KEY=your_key
MONGODB_URI=your_uri
JWT_SECRET=your_secret
```

```bash
node server.js
```

Open `http://localhost:3000`

---

## Releases

| Version | Name | Status |
|---------|------|--------|
| v1.0 | Nineveh | Live |
| v1.1 | Alexandria | Upcoming |
| v1.2 | Pergamon | Upcoming |
| v1.3 | Nalanda | Upcoming |
| v2.0 | Babylon | Upcoming |

---

## Built by

[Jordan Spencer](https://jpcspencer.com) — [@jpcspencer](https://twitter.com/jpcspencer)

*Colony is free during beta. Each run uses real AI compute.*
