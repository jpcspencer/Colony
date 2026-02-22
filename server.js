// server.js — Colony web interface

require('dotenv').config();
const express = require('express');
const { runColony } = require('./src/loop');
const { connectDB, Finding, Synthesis } = require('./src/db');

connectDB();

const app = express();
app.use(express.json());

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Colony — Research Engine</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='8' fill='%230a0a0a'/><text x='50' y='54' font-size='68' font-family='Georgia,serif' fill='%238b7355' text-anchor='middle' dominant-baseline='middle'>C</text></svg>">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    :root {
      --bg: #0a0a0a;
      --text: #e8e4d9;
      --text-muted: #9a958a;
      --accent: #8b7355;
      --seeder: #4a6741;
      --explorer: #8b6914;
      --critic: #7a2e2e;
      --synthesizer: #2e4a6b;
      --memory: #4a2e6b;
      --border: #2a2620;
      --terminal-bg: #0f0e0c;
      --terminal-border: #3d3529;
      --seeder-hex: #4a6741;
      --explorer-hex: #c8a84b;
      --critic-hex: #b04040;
      --synthesizer-hex: #5a7a9a;
      --memory-hex: #7a5a9a;
      --verifier: #4a7a6a;
    }
    body.light {
      --bg: #f5f0e8;
      --text: #2a2420;
      --text-muted: #6b6355;
      --accent: #8b7355;
      --terminal-bg: #ede8de;
      --terminal-border: #c8c0b0;
      --seeder: #2d4a28;
      --explorer: #6b4f0a;
      --critic: #5a1f1f;
      --synthesizer: #1f3a5a;
      --memory: #3a1f5a;
      --verifier: #1f4a3a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'IBM Plex Mono', monospace;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
    }
    .container {
      width: 100%;
      max-width: 800px;
    }
    h1 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 600;
      font-size: 2.25rem;
      margin-bottom: 0.5rem;
      color: var(--accent);
      letter-spacing: 0.02em;
    }
    .subtitle {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      color: var(--text-muted);
      font-size: 1rem;
      margin-bottom: 2rem;
    }
    .input-row {
      display: flex;
      gap: 0.75rem;
      width: 100%;
      margin-bottom: 1.5rem;
    }
    input[type="text"] {
      flex: 1;
      padding: 0.75rem 1rem;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.9rem;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      color: var(--text);
      outline: none;
    }
    input[type="text"]:focus { border-color: var(--accent); }
    input[type="text"]::placeholder { color: var(--text-muted); }
    button {
      padding: 0.75rem 1.5rem;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 600;
      font-size: 1rem;
      background: var(--accent);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      color: var(--bg);
      cursor: pointer;
      white-space: nowrap;
    }
    button:hover { filter: brightness(1.1); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .output-panel {
      width: 100%;
      height: 480px;
      background: var(--terminal-bg);
      border: 2px solid var(--terminal-border);
      border-radius: 4px;
      padding: 1.25rem 1.5rem;
      overflow-y: auto;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.8rem;
      line-height: 1.7;
      white-space: pre-wrap;
      word-break: break-word;
      box-shadow: inset 0 0 60px rgba(0,0,0,0.4), 0 4px 20px rgba(0,0,0,0.3);
      position: relative;
    }
    .output-panel::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(180deg, transparent 0%, rgba(10,10,10,0.03) 100%);
      pointer-events: none;
      border-radius: 2px;
    }
    .output-panel:empty::after {
      content: '> awaiting input...';
      color: var(--text-muted);
      animation: blink 1.2s step-end infinite;
    }
    @keyframes blink { 50% { opacity: 0.4; } }
    .line {
      margin-bottom: 0.2rem;
      animation: ticker-in 0.15s ease-out;
    }
    @keyframes ticker-in {
      from { opacity: 0; transform: translateY(-2px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .line[data-agent="seeder"] { color: var(--seeder); }
    .line[data-agent="explorer"] { color: var(--explorer); }
    .line[data-agent="critic"] { color: var(--critic); }
    .line[data-agent="synthesizer"] { color: var(--synthesizer); }
    .line[data-agent="memory"] { color: var(--memory); }
    .line[data-agent="verifier"] { color: var(--verifier); }
    .line[data-agent="loop"] { color: var(--text-muted); }
    .line[data-agent="web"] { color: var(--text-muted); }
    .mode-toggle {
      display: flex;
      gap: 0;
      margin-bottom: 1.5rem;
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      overflow: hidden;
      width: fit-content;
    }
    .mode-btn {
      padding: 0.4rem 1.2rem;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.75rem;
      background: transparent;
      border: none;
      border-radius: 0;
      color: var(--text-muted);
      cursor: pointer;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .mode-btn.active {
      background: var(--terminal-border);
      color: var(--text);
    }
    .mode-btn:hover:not(.active) { color: var(--text); }
    .history-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      padding: 0;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      color: var(--text-muted);
      cursor: pointer;
      flex-shrink: 0;
    }
    .history-btn:hover { color: var(--text); border-color: var(--accent); }
    .history-dropdown {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      max-height: 240px;
      overflow-y: auto;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.75rem;
      z-index: 10;
    }
    .history-dropdown.visible { display: block; }
    .history-item {
      padding: 0.5rem 1rem;
      color: var(--text-muted);
      cursor: pointer;
      border-bottom: 1px solid var(--terminal-border);
    }
    .history-item:last-child { border-bottom: none; }
    .history-item:hover { background: rgba(139,115,85,0.15); color: var(--text); }
    #graph-panel {
      width: 100%;
      height: 480px;
      background: var(--terminal-bg);
      border: 2px solid var(--terminal-border);
      border-radius: 4px;
      display: none;
      position: relative;
      overflow: hidden;
    }
    #graph-panel canvas {
      display: block;
    }
    .graph-hint {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      color: #2a2820;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      pointer-events: none;
      transition: opacity 1s ease;
    }
    .node-info {
      position: absolute;
      bottom: 12px;
      left: 16px;
      max-width: 420px;
      pointer-events: none;
      display: none;
    }
    .node-info.visible { display: block; }
    .node-info .ni-agent {
      font-size: 10px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .node-info .ni-thread {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13px;
      color: var(--text);
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .node-info .ni-finding {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .node-count-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      font-size: 10px;
      color: var(--accent);
      letter-spacing: 0.1em;
    }
    .top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .nav-links {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }
    .nav-link {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.75rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      transition: color 0.2s;
    }
    .nav-link:hover, .nav-link.active {
      color: var(--accent);
      filter: none;
    }
    .theme-toggle {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      cursor: pointer;
      background: none;
      border: 1px solid var(--terminal-border);
      border-radius: 3px;
      padding: 0.25rem 0.6rem;
    }
    .theme-toggle:hover {
      color: var(--text);
      filter: none;
    }
    .page-view {
      display: none;
      width: 100%;
      animation: fadeIn 0.2s ease;
    }
    .page-view.active { display: block; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .atlas-header {
      margin-bottom: 1.5rem;
    }
    .atlas-header h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.5rem;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }
    .atlas-header p {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
    }
    .atlas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1rem;
      max-height: 520px;
      overflow-y: auto;
    }
    .atlas-card {
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      padding: 1rem 1.25rem;
      cursor: default;
      transition: border-color 0.2s;
    }
    .atlas-card:hover { border-color: var(--accent); }
    .atlas-card .card-agent {
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }
    .atlas-card .card-thread {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 0.95rem;
      color: var(--text);
      margin-bottom: 0.5rem;
      line-height: 1.4;
    }
    .atlas-card .card-finding {
      font-size: 0.72rem;
      color: var(--text-muted);
      line-height: 1.6;
      max-height: 60px;
      overflow: hidden;
    }
    .atlas-card .card-meta {
      margin-top: 0.6rem;
      font-size: 0.65rem;
      color: var(--terminal-border);
      display: flex;
      justify-content: space-between;
    }
    .atlas-card .card-confidence {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .conf-bar {
      width: 50px;
      height: 2px;
      background: var(--terminal-border);
      position: relative;
    }
    .conf-fill {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      background: var(--accent);
    }
    .atlas-empty {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-style: italic;
      padding: 2rem 0;
    }
    .codex-header {
      margin-bottom: 1.5rem;
    }
    .codex-header h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.5rem;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }
    .codex-header p {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
    }
    .codex-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 520px;
      overflow-y: auto;
    }
    .codex-entry {
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .codex-entry:hover { border-color: var(--accent); }
    .codex-entry .entry-goal {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1rem;
      color: var(--text);
      margin-bottom: 0.3rem;
    }
    .codex-entry .entry-meta {
      font-size: 0.7rem;
      color: var(--text-muted);
      display: flex;
      gap: 1rem;
    }
    .codex-detail {
      display: none;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid var(--terminal-border);
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.7;
      white-space: pre-wrap;
      max-height: 300px;
      overflow-y: auto;
    }
    .codex-detail.visible { display: block; }
    .system-content {
      max-height: 520px;
      overflow-y: auto;
      padding-right: 0.5rem;
    }
    .system-content h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.5rem;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }
    .system-content .system-tagline {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 2rem;
    }
    .system-section {
      margin-bottom: 2rem;
    }
    .system-section h3 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.1rem;
      color: var(--text);
      margin-bottom: 0.75rem;
      border-bottom: 1px solid var(--terminal-border);
      padding-bottom: 0.4rem;
    }
    .system-section p {
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.8;
      margin-bottom: 0.75rem;
    }
    .agent-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .agent-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .agent-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 4px;
    }
    .agent-item .agent-name {
      font-size: 0.75rem;
      color: var(--text);
      letter-spacing: 0.05em;
      margin-bottom: 0.15rem;
    }
    .agent-item .agent-desc {
      font-size: 0.72rem;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .auth-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.7);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    .auth-overlay.visible {
      display: flex;
    }
    .auth-modal {
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 6px;
      padding: 2.5rem;
      width: 100%;
      max-width: 400px;
      position: relative;
    }
    .auth-modal h2 {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 1.6rem;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }
    .auth-modal .auth-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 2rem;
    }
    .auth-field {
      margin-bottom: 1rem;
    }
    .auth-field label {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
    }
    .auth-field input {
      width: 100%;
      padding: 0.65rem 0.9rem;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 0.85rem;
      background: var(--bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      color: var(--text);
      outline: none;
    }
    .auth-field input:focus {
      border-color: var(--accent);
    }
    .auth-submit {
      width: 100%;
      padding: 0.75rem;
      margin-top: 0.5rem;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 600;
      font-size: 1rem;
      background: var(--accent);
      border: none;
      border-radius: 4px;
      color: var(--bg);
      cursor: pointer;
    }
    .auth-submit:hover { filter: brightness(1.1); }
    .auth-error {
      font-size: 0.75rem;
      color: var(--critic);
      margin-top: 0.75rem;
      min-height: 1rem;
    }
    .auth-switch {
      margin-top: 1.25rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }
    .auth-switch span {
      color: var(--accent);
      cursor: pointer;
      text-decoration: underline;
    }
    .auth-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0;
    }
    .nav-user {
      font-size: 0.72rem;
      color: var(--text-muted);
      letter-spacing: 0.05em;
    }
    .nav-user span {
      color: var(--accent);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-bar">
      <div>
        <h1>Colony</h1>
        <p class="subtitle">Recursive research engine — map a goal into threads, explore, critique, synthesize</p>
      </div>
      <div class="nav-links">
        <button class="nav-link" id="nav-atlas">Atlas</button>
        <button class="nav-link" id="nav-codex">Codex</button>
        <button class="nav-link" id="nav-system">System</button>
        <button class="theme-toggle" id="theme-toggle">Light</button>
        <button class="nav-link" id="nav-signin">Sign In</button>
        <span class="nav-user" id="nav-user" style="display:none"></span>
      </div>
    </div>

    <!-- Main research view -->
    <div id="view-main" class="page-view active">
      <div class="input-row">
        <button class="theme-toggle" id="history-btn" style="padding: 0.75rem; font-size: 1rem; border-color: var(--terminal-border);">⏱</button>
        <input type="text" id="goal" placeholder="Enter your research goal..." />
        <button id="launch">Launch Colony</button>
      </div>
      <div id="history-panel" style="display:none; background:var(--terminal-bg); border:1px solid var(--terminal-border); border-radius:4px; margin-bottom:1rem; max-height:200px; overflow-y:auto;"></div>
      <div class="mode-toggle">
        <button class="mode-btn active" id="btn-stream">Stream</button>
        <button class="mode-btn" id="btn-web">Web</button>
      </div>
      <div class="output-panel" id="output"></div>
      <div id="graph-panel">
        <canvas id="graph-canvas"></canvas>
        <div class="node-count-badge" id="graph-node-count">0 findings</div>
        <div class="node-info" id="node-info">
          <div class="ni-agent" id="ni-agent"></div>
          <div class="ni-thread" id="ni-thread"></div>
          <div class="ni-finding" id="ni-finding"></div>
        </div>
        <div class="graph-hint" id="graph-hint">drag · scroll · click</div>
      </div>
    </div>

    <!-- Atlas view -->
    <div id="view-atlas" class="page-view">
      <div class="atlas-header">
        <h2>Atlas</h2>
        <p>The accumulated knowledge graph — every verified finding Colony has ever produced</p>
      </div>
      <div class="atlas-grid" id="atlas-grid">
        <div class="atlas-empty">Loading knowledge graph...</div>
      </div>
    </div>

    <!-- Codex view -->
    <div id="view-codex" class="page-view">
      <div class="codex-header">
        <h2>Codex</h2>
        <p>Every completed research synthesis — Colony's archive of completed investigations</p>
      </div>
      <div class="codex-list" id="codex-list">
        <div class="atlas-empty">Loading synthesis archive...</div>
      </div>
    </div>

    <!-- System view -->
    <div id="view-system" class="page-view">
      <div class="system-content">
        <h2>System</h2>
        <p class="system-tagline">Colony is a recursive peer-reviewed AI research platform. Not a chatbot. Not a search engine. A living research institution.</p>

        <div class="system-section">
          <h3>The Core Insight</h3>
          <p>Every other AI tool answers questions. Colony explores domains. It seeds a research goal into multiple parallel threads, explores each with real web search and academic sources, subjects every finding to adversarial peer review, and synthesizes a final report grounded in verified citations.</p>
          <p>Over time, Colony builds a persistent knowledge graph that compounds across sessions. A Colony that has researched longevity for six months has mapped contradictions and built structured knowledge that doesn't exist anywhere else.</p>
        </div>

        <div class="system-section">
          <h3>The Six Agents</h3>
          <div class="agent-list">
            <div class="agent-item">
              <div class="agent-dot" style="background:#4a6741"></div>
              <div>
                <div class="agent-name">Seeder</div>
                <div class="agent-desc">Takes the research goal and maps it into 3–5 focused exploration threads. Like a professor outlining a research syllabus.</div>
              </div>
            </div>
            <div class="agent-item">
              <div class="agent-dot" style="background:#c8a84b"></div>
              <div>
                <div class="agent-name">Explorer</div>
                <div class="agent-desc">Researches one thread deeply using Brave Search and academic sources. Injects prior colony knowledge before researching — building on what Colony already knows.</div>
              </div>
            </div>
            <div class="agent-item">
              <div class="agent-dot" style="background:#b04040"></div>
              <div>
                <div class="agent-name">Critic</div>
                <div class="agent-desc">Peer-reviews every Explorer finding. Scores confidence 0–100, flags logical gaps, demands citations, triggers recursion into unresolved questions. Adversarial by design.</div>
              </div>
            </div>
            <div class="agent-item">
              <div class="agent-dot" style="background:#4a7a6a"></div>
              <div>
                <div class="agent-name">Verifier</div>
                <div class="agent-desc">Fetches every cited URL and checks whether the source actually supports the claim made. Flags dead links, paywalled sources, and hallucinated attributions.</div>
              </div>
            </div>
            <div class="agent-item">
              <div class="agent-dot" style="background:#5a7a9a"></div>
              <div>
                <div class="agent-name">Synthesizer</div>
                <div class="agent-desc">After all threads complete, reads the entire colony memory and writes the final report with confidence ratings, unresolved contradictions, and epistemic integrity assessment.</div>
              </div>
            </div>
            <div class="agent-item">
              <div class="agent-dot" style="background:#7a5a9a"></div>
              <div>
                <div class="agent-name">Memory</div>
                <div class="agent-desc">Persists all findings to the knowledge graph with full metadata — thread, finding summary, verified citations, critic verdict, confidence score, domain tags, timestamp, run ID.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="system-section">
          <h3>The Defensible Moat</h3>
          <p>Colony's knowledge graph accumulates across every session. Each run builds on everything Colony has ever learned about a domain. This compounding structure — adversarial research that never forgets — is not replicable by spinning up a competitor overnight.</p>
          <p>Built by Jordan Spencer (@0xJozen) · February 2026</p>
        </div>
      </div>
    </div>
  </div>

  <script>
// ── Agent config ──────────────────────────────────────────────
const AGENT_COLORS_HEX = {
  seeder: 0x4a6741, explorer: 0xc8a84b, critic: 0xb04040,
  synthesizer: 0x5a7a9a, memory: 0x7a5a9a, default: 0x8b7355
};
const AGENT_CSS = {
  seeder: '#4a6741', explorer: '#c8a84b', critic: '#b04040',
  synthesizer: '#5a7a9a', memory: '#7a5a9a', default: '#8b7355'
};
const AGENT_LABELS = {
  seeder:'Seeder', explorer:'Explorer', critic:'Critic',
  synthesizer:'Synthesizer', memory:'Memory'
};

// ── DOM refs ──────────────────────────────────────────────────
const goalInput = document.getElementById('goal');
const launchBtn = document.getElementById('launch');
const output    = document.getElementById('output');
const graphPanel = document.getElementById('graph-panel');
const btnStream = document.getElementById('btn-stream');
const btnWeb    = document.getElementById('btn-web');

// ── Mode toggle ───────────────────────────────────────────────
let currentMode = 'stream';
btnStream.addEventListener('click', () => setMode('stream'));
btnWeb.addEventListener('click',    () => setMode('web'));

function setMode(mode) {
  currentMode = mode;
  if (mode === 'stream') {
    output.style.display = 'block';
    graphPanel.style.display = 'none';
    btnStream.classList.add('active');
    btnWeb.classList.remove('active');
  } else {
    output.style.display = 'none';
    graphPanel.style.display = 'block';
    btnStream.classList.remove('active');
    btnWeb.classList.add('active');
    initGraph();
    resizeGraph();
  }
}

// ── Stream logic ──────────────────────────────────────────────
function agentForLine(text) {
  if (/\\[SEEDER\\]|🌱/.test(text)) return 'seeder';
  if (/\\[EXPLORER\\]|🔍|\\[WEB SEARCH\\]/.test(text)) return 'explorer';
  if (/\\[CRITIC\\]|⚖️|📊/.test(text)) return 'critic';
  if (/\\[SYNTHESIZER\\]|🧬|🏁|FINAL SYNTHESIS/.test(text)) return 'synthesizer';
  if (/\\[MEMORY\\]|📁|knowledge/.test(text)) return 'memory';
  if (/\\[LOOP\\]|🔄|✅|⚠️/.test(text)) return 'loop';
  if (/✓ \\[VERIFIER\\]/.test(text)) return 'verifier';
  return 'web';
}

function appendLine(text) {
  const div = document.createElement('div');
  div.className = 'line';
  div.dataset.agent = agentForLine(text);
  div.textContent = text;
  output.appendChild(div);
  const isScrolledToBottom = output.scrollHeight - output.clientHeight <= output.scrollTop + 50;
  if (isScrolledToBottom) output.scrollTop = output.scrollHeight;
  tryParseNode(text);
}

// ── Node parsing from stream ──────────────────────────────────
const graphNodes = [];
function tryParseNode(text) {
  if (text.includes('citation(s) preserved for this thread')) {
    const threadMatch = text.match(/for thread: "([^"]+)"/);
    const thread = threadMatch ? threadMatch[1] : 'Finding';
    addGraphNode({
      thread,
      agent: 'explorer',
      finding: text,
      confidence: 65 + Math.floor(Math.random() * 25),
      runId: new Date().toISOString().slice(0,16)
    });
  }
  if (text.includes('[SYNTHESIZER]')) {
    addGraphNode({
      thread: 'Synthesis',
      agent: 'synthesizer',
      finding: 'Synthesizing all colony findings...',
      confidence: 90,
      runId: new Date().toISOString().slice(0,16)
    });
  }
  if (text.includes('[EXPLORER]') && text.includes('Researching thread:')) {
    const threadMatch = text.match(/Researching thread: "([^"]+)"/);
    const thread = threadMatch ? threadMatch[1] : 'Explorer thread';
    addGraphNode({
      thread,
      agent: 'explorer',
      finding: text,
      confidence: 60 + Math.floor(Math.random() * 20),
      runId: new Date().toISOString().slice(0,16)
    });
  }
}

// ── Three.js graph ────────────────────────────────────────────────
let graphInitialized = false;
let threeRenderer, threeScene, threeCamera, nodeMeshes = [], animFrame;
let isDragging = false, prevMouse = {x:0,y:0};
let spherical = {theta:0, phi:1.2, r:22};
let targetSpherical = {theta:0, phi:1.2, r:22};
let autoRotate = true;
let selectedMesh = null;

function initGraph() {
  if (graphInitialized) return;
  graphInitialized = true;

  const canvas = document.getElementById('graph-canvas');
  const W = graphPanel.clientWidth, H = graphPanel.clientHeight;

  threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  threeRenderer.setSize(W, H);
  threeRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  threeRenderer.setClearColor(0x0f0e0c, 1);

  threeScene = new THREE.Scene();
  threeScene.fog = new THREE.FogExp2(0x0f0e0c, 0.025);

  threeCamera = new THREE.PerspectiveCamera(60, W/H, 0.1, 500);
  updateCameraPos();

  threeScene.add(new THREE.AmbientLight(0x332211, 0.5));
  const pl = new THREE.PointLight(0xc8a84b, 0.8, 80);
  pl.position.set(0, 10, 10);
  threeScene.add(pl);

  // Dust particles
  const pg = new THREE.BufferGeometry();
  const pp = new Float32Array(200 * 3);
  for (let i = 0; i < 200; i++) {
    pp[i*3]   = (Math.random()-.5)*50;
    pp[i*3+1] = (Math.random()-.5)*50;
    pp[i*3+2] = (Math.random()-.5)*50;
  }
  pg.setAttribute('position', new THREE.BufferAttribute(pp,3));
  threeScene.add(new THREE.Points(pg, new THREE.PointsMaterial({color:0x2a2018, size:0.06, transparent:true, opacity:0.5})));

  // Add any nodes already collected
  graphNodes.forEach(n => spawnNode(n));

  // Controls
  const cvs = threeRenderer.domElement;
  cvs.addEventListener('mousedown', e => { isDragging=true; autoRotate=false; prevMouse={x:e.clientX,y:e.clientY}; });
  cvs.addEventListener('mousemove', e => {
    if (!isDragging) return;
    targetSpherical.theta -= (e.clientX-prevMouse.x)*0.008;
    targetSpherical.phi = Math.max(0.3, Math.min(Math.PI-0.3, targetSpherical.phi+(e.clientY-prevMouse.y)*0.008));
    prevMouse={x:e.clientX,y:e.clientY};
  });
  cvs.addEventListener('mouseup', () => isDragging=false);
  cvs.addEventListener('wheel', e => { targetSpherical.r = Math.max(6, Math.min(60, targetSpherical.r+e.deltaY*0.04)); autoRotate=false; });

  const raycaster = new THREE.Raycaster();
  const mouse2 = new THREE.Vector2();
  cvs.addEventListener('click', e => {
    const rect = cvs.getBoundingClientRect();
    mouse2.x = ((e.clientX-rect.left)/rect.width)*2-1;
    mouse2.y = -((e.clientY-rect.top)/rect.height)*2+1;
    raycaster.setFromCamera(mouse2, threeCamera);
    const hits = raycaster.intersectObjects(nodeMeshes);
    if (hits.length) showNodeInfo(hits[0].object);
    else hideNodeInfo();
  });

  setTimeout(() => {
    const hint = document.getElementById('graph-hint');
    if (hint) hint.style.opacity = '0';
  }, 4000);

  animateGraph();
}

function updateCameraPos() {
  threeCamera.position.set(
    spherical.r * Math.sin(spherical.phi) * Math.cos(spherical.theta),
    spherical.r * Math.cos(spherical.phi),
    spherical.r * Math.sin(spherical.phi) * Math.sin(spherical.theta)
  );
  threeCamera.lookAt(0,0,0);
}

let graphTime = 0;
function animateGraph() {
  animFrame = requestAnimationFrame(animateGraph);
  graphTime += 0.016;
  if (autoRotate) targetSpherical.theta += 0.003;
  spherical.theta += (targetSpherical.theta - spherical.theta) * 0.06;
  spherical.phi   += (targetSpherical.phi   - spherical.phi)   * 0.06;
  spherical.r     += (targetSpherical.r     - spherical.r)     * 0.06;
  updateCameraPos();
  nodeMeshes.forEach((m,i) => {
    if (m === selectedMesh) return;
    const p = Math.sin(graphTime*0.8+i*0.9)*0.05+1;
    m.scale.setScalar(p);
    m.material.emissiveIntensity = 0.2 + Math.sin(graphTime*0.5+i*1.3)*0.08;
  });
  threeRenderer.render(threeScene, threeCamera);
}

function spawnNode(nodeData) {
  const pos = new THREE.Vector3(
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 16,
    (Math.random() - 0.5) * 16
  );

  const color = AGENT_COLORS_HEX[nodeData.agent] || AGENT_COLORS_HEX.default;
  const size = 0.15 + (nodeData.confidence/100)*0.2;

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(size*2.8,12,12),
    new THREE.MeshBasicMaterial({color, transparent:true, opacity:0.05})
  );
  glow.position.copy(pos);
  threeScene.add(glow);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(size,18,18),
    new THREE.MeshPhongMaterial({color, emissive:color, emissiveIntensity:0.25, transparent:true, opacity:0.9, shininess:60})
  );
  mesh.position.copy(pos);
  mesh.userData = { nodeData, pos };
  threeScene.add(mesh);
  nodeMeshes.push(mesh);

  // Edge to nearest prior node
  if (nodeMeshes.length > 1) {
    const prev = nodeMeshes[nodeMeshes.length-2];
    const pts = [prev.userData.pos, pos];
    const eg = new THREE.BufferGeometry().setFromPoints(pts);
    threeScene.add(new THREE.Line(eg, new THREE.LineBasicMaterial({color:0x3a3228, transparent:true, opacity:0.2})));
  }

  document.getElementById('graph-node-count').textContent = nodeMeshes.length + ' findings';
}

function addGraphNode(data) {
  graphNodes.push(data);
  if (graphInitialized) spawnNode(data);
}

function showNodeInfo(mesh) {
  if (selectedMesh) { selectedMesh.material.emissiveIntensity=0.25; selectedMesh.scale.setScalar(1); }
  selectedMesh = mesh;
  mesh.material.emissiveIntensity = 1;
  mesh.scale.setScalar(1.6);
  const d = mesh.userData.nodeData;
  document.getElementById('ni-agent').textContent = AGENT_LABELS[d.agent] || d.agent;
  document.getElementById('ni-agent').style.color = AGENT_CSS[d.agent] || AGENT_CSS.default;
  document.getElementById('ni-thread').textContent = d.thread;
  document.getElementById('ni-finding').textContent = d.finding.slice(0, 160) + '...';
  document.getElementById('node-info').classList.add('visible');
}

function hideNodeInfo() {
  if (selectedMesh) { selectedMesh.material.emissiveIntensity=0.25; selectedMesh.scale.setScalar(1); selectedMesh=null; }
  document.getElementById('node-info').classList.remove('visible');
}

function resizeGraph() {
  if (!threeRenderer) return;
  const W = graphPanel.clientWidth, H = graphPanel.clientHeight;
  threeCamera.aspect = W/H;
  threeCamera.updateProjectionMatrix();
  threeRenderer.setSize(W,H);
}

// ── Query history ─────────────────────────────────────────────
const HISTORY_KEY = 'colony-history';
const MAX_HISTORY = 20;

function saveToHistory(query) {
  try {
    let history = [];
    try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(_) {}
    history.unshift({ query, timestamp: Date.now() });
    history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch(_) {}
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch(_) { return []; }
}

// ── Launch ────────────────────────────────────────────────────
launchBtn.addEventListener('click', async () => {
  const goal = goalInput.value.trim();
  if (!goal) return;
  saveToHistory(goal);
  launchBtn.disabled = true;
  output.innerHTML = '';
  graphNodes.length = 0;
  nodeMeshes.forEach(m => threeScene && threeScene.remove(m));
  nodeMeshes.length = 0;

  try {
    const res = await fetch('/run', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({goal})
    });
    if (!res.ok) throw new Error(res.statusText);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream:true});
      const lines = buffer.split('\\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) appendLine(data.text);
          } catch(_) {}
        }
      }
    }
  } catch(err) {
    appendLine('Error: ' + err.message);
  } finally {
    launchBtn.disabled = false;
  }
});

window.addEventListener('resize', resizeGraph);

// ── Navigation ────────────────────────────────────────────────
const views = {
  main: document.getElementById('view-main'),
  atlas: document.getElementById('view-atlas'),
  codex: document.getElementById('view-codex'),
  system: document.getElementById('view-system')
};

const navLinks = {
  atlas: document.getElementById('nav-atlas'),
  codex: document.getElementById('nav-codex'),
  system: document.getElementById('nav-system')
};

function showView(name) {
  Object.values(views).forEach(v => v.classList.remove('active'));
  Object.values(navLinks).forEach(l => l && l.classList.remove('active'));
  views[name].classList.add('active');
  if (navLinks[name]) navLinks[name].classList.add('active');
  if (name === 'atlas') loadAtlas();
  if (name === 'codex') loadCodex();
}

document.getElementById('nav-atlas').addEventListener('click', () => showView('atlas'));
document.getElementById('nav-codex').addEventListener('click', () => showView('codex'));
document.getElementById('nav-system').addEventListener('click', () => showView('system'));

document.querySelector('h1').addEventListener('click', () => showView('main'));
document.querySelector('h1').style.cursor = 'pointer';

// ── Theme toggle ──────────────────────────────────────────────
const themeBtn = document.getElementById('theme-toggle');
let isLight = false;
themeBtn.addEventListener('click', () => {
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
  themeBtn.textContent = isLight ? 'Dark' : 'Light';
});

// ── Atlas ─────────────────────────────────────────────────────
const AGENT_CSS_MAP = {
  seeder: '#4a6741', explorer: '#c8a84b', critic: '#b04040',
  synthesizer: '#5a7a9a', memory: '#7a5a9a', verifier: '#4a7a6a',
  default: '#8b7355'
};

async function loadAtlas() {
  const grid = document.getElementById('atlas-grid');
  grid.innerHTML = '<div class="atlas-empty">Loading...</div>';
  try {
    const data = await fetch('/api/atlas').then(r => r.json());
    if (!data.length) {
      grid.innerHTML = '<div class="atlas-empty">No findings yet. Launch a colony to begin building the Atlas.</div>';
      return;
    }
    grid.innerHTML = data.map(entry => {
      const color = AGENT_CSS_MAP[entry.agent] || AGENT_CSS_MAP.default;
      const conf = entry.confidenceScore || 70;
      const verifiedCount = (entry.sources || []).filter(s => s.verified).length;
      const totalSources = (entry.sources || []).length;
      return \`<div class="atlas-card">
        <div class="card-agent" style="color:\${color}">\${(entry.agent || 'explorer').toUpperCase()}</div>
        <div class="card-thread">\${entry.thread || ''}</div>
        <div class="card-finding">\${entry.findingSummary || ''}</div>
        <div class="card-meta">
          <span>\${entry.runId || ''}</span>
          <div class="card-confidence">
            <div class="conf-bar"><div class="conf-fill" style="width:\${conf}%"></div></div>
            <span>\${conf}</span>
            \${totalSources ? \`<span style="color:var(--verifier)">\${verifiedCount}/\${totalSources} verified</span>\` : ''}
          </div>
        </div>
      </div>\`;
    }).join('');
  } catch(err) {
    grid.innerHTML = '<div class="atlas-empty">Could not load knowledge graph.</div>';
  }
}

// ── Codex ─────────────────────────────────────────────────────
async function loadCodex() {
  const list = document.getElementById('codex-list');
  list.innerHTML = '<div class="atlas-empty">Loading...</div>';
  try {
    const data = await fetch('/api/codex').then(r => r.json());
    if (!data.length) {
      list.innerHTML = '<div class="atlas-empty">No syntheses yet. Complete a colony run to populate the Codex.</div>';
      return;
    }
    list.innerHTML = data.map((entry, i) => \`
      <div class="codex-entry" onclick="toggleCodex(\${i})">
        <div class="entry-goal">\${entry.goal}</div>
        <div class="entry-meta">
          <span>\${entry.date}</span>
          <span>\${entry.iterations} iterations</span>
        </div>
        <div class="codex-detail" id="codex-detail-\${i}">\${entry.preview}...</div>
      </div>
    \`).join('');
  } catch(err) {
    list.innerHTML = '<div class="atlas-empty">Could not load synthesis archive.</div>';
  }
}

function toggleCodex(i) {
  const detail = document.getElementById(\`codex-detail-\${i}\`);
  detail.classList.toggle('visible');
}

// ── Query history ─────────────────────────────────────────────
const historyBtn = document.getElementById('history-btn');
const historyPanel = document.getElementById('history-panel');

historyBtn.addEventListener('click', () => {
  const history = JSON.parse(localStorage.getItem('colony-history') || '[]');
  if (!history.length) return;
  historyPanel.style.display = historyPanel.style.display === 'none' ? 'block' : 'none';
  historyPanel.innerHTML = history.map(h => \`
    <div onclick="selectHistory('\${h.query.replace(/'/g, "\\\\'")}'); this.parentElement.style.display='none'"
         style="padding:0.6rem 1rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer; border-bottom:1px solid var(--terminal-border)">
      <span style="color:var(--text-muted); font-size:0.65rem; margin-right:0.5rem">\${new Date(h.timestamp).toLocaleString()}</span>
      \${h.query}
    </div>
  \`).join('');
});

function selectHistory(query) {
  document.getElementById('goal').value = query;
  showView('main');
}

function updateClock() {
  const el = document.getElementById('live-clock');
  if (el) el.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit', hour12: false});
}
updateClock();
setInterval(updateClock, 1000);

// ── Auth state ────────────────────────────────────────────────
let authToken = localStorage.getItem('colony-token');
let authEmail = localStorage.getItem('colony-email');

function updateAuthUI() {
  const signinBtn = document.getElementById('nav-signin');
  const userSpan = document.getElementById('nav-user');
  if (authToken && authEmail) {
    signinBtn.style.display = 'none';
    userSpan.style.display = 'inline';
    userSpan.innerHTML = '<span>' + authEmail.split('@')[0] + '</span>';
  } else {
    signinBtn.style.display = 'inline';
    userSpan.style.display = 'none';
  }
}

updateAuthUI();

// ── Auth modal ────────────────────────────────────────────────
const authOverlay = document.getElementById('auth-overlay');
let authMode = 'login';

document.getElementById('nav-signin').addEventListener('click', () => {
  authOverlay.classList.add('visible');
});

document.getElementById('auth-close').addEventListener('click', () => {
  authOverlay.classList.remove('visible');
  document.getElementById('auth-error').textContent = '';
});

document.getElementById('auth-switch-link').addEventListener('click', () => {
  authMode = authMode === 'login' ? 'signup' : 'login';
  const isLogin = authMode === 'login';
  document.getElementById('auth-title').textContent = isLogin ? 'Sign in' : 'Create account';
  document.getElementById('auth-subtitle').textContent = isLogin ? 'Continue your research' : 'Begin your research';
  document.getElementById('auth-submit').textContent = isLogin ? 'Sign in' : 'Create account';
  document.getElementById('auth-switch-link').textContent = isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in';
  document.getElementById('auth-error').textContent = '';
});

document.getElementById('auth-submit').addEventListener('click', async () => {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Please enter email and password';
    return;
  }

  try {
    const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Something went wrong';
      return;
    }
    authToken = data.token;
    authEmail = data.email;
    localStorage.setItem('colony-token', authToken);
    localStorage.setItem('colony-email', authEmail);
    updateAuthUI();
    authOverlay.classList.remove('visible');
  } catch (err) {
    errorEl.textContent = 'Connection error';
  }
});

authOverlay.addEventListener('click', e => {
  if (e.target === authOverlay) {
    authOverlay.classList.remove('visible');
  }
});

document.getElementById('auth-password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('auth-submit').click();
});
  </script>
  <div id="live-clock" style="
    position: fixed;
    top: 1.5rem;
    left: 2rem;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.1rem;
    font-style: italic;
    color: var(--text-muted);
    letter-spacing: 0.12em;
    pointer-events: none;
    z-index: 100;
  "></div>

  <div class="auth-overlay" id="auth-overlay">
    <div class="auth-modal">
      <button class="auth-close" id="auth-close">✕</button>
      <h2 id="auth-title">Sign in</h2>
      <p class="auth-subtitle" id="auth-subtitle">Continue your research</p>
      <div class="auth-field">
        <label>Email</label>
        <input type="email" id="auth-email" placeholder="your@email.com" />
      </div>
      <div class="auth-field">
        <label>Password</label>
        <input type="password" id="auth-password" placeholder="••••••••" />
      </div>
      <button class="auth-submit" id="auth-submit">Sign in</button>
      <div class="auth-error" id="auth-error"></div>
      <div class="auth-switch">
        <span id="auth-switch-link">Don't have an account? Sign up</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.type('html').send(HTML);
});

app.post('/run', async (req, res) => {
  const goal = req.body?.goal;
  if (!goal) {
    return res.status(400).json({ error: 'Missing goal' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const emit = (msg) => {
    res.write(`data: ${JSON.stringify({ text: msg })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  };

  try {
    await runColony(goal, emit);
  } catch (err) {
    emit(`Error: ${err.message}`);
  } finally {
    res.end();
  }
});

// Serve knowledge graph entries
app.get('/api/atlas', async (req, res) => {
  try {
    const findings = await Finding.find({ isPublic: true })
      .sort({ timestamp: -1 })
      .limit(200);
    res.json(findings);
  } catch (err) {
    res.json([]);
  }
});

// Serve synthesis list
app.get('/api/codex', async (req, res) => {
  try {
    const syntheses = await Synthesis.find({ isPublic: true })
      .sort({ timestamp: -1 });
    res.json(syntheses.map(doc => ({
      goal: doc.goal,
      date: doc.timestamp ? new Date(doc.timestamp).toISOString().slice(0, 10) : '',
      iterations: doc.iterations,
      preview: (doc.content || '').slice(0, 800)
    })));
  } catch (err) {
    res.json([]);
  }
});

const User = require('./src/models/user');
const { signToken, authMiddleware } = require('./src/auth');

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ email, password });
    const token = signToken(user._id);
    res.json({ token, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(user._id);
    res.json({ token, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = await User.findById(req.userId).select('email createdAt');
  res.json(user);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Colony server at http://localhost:${PORT}`);
});
