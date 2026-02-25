// server.js — Colony web interface

require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { marked } = require('marked');
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
  <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
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
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      transition: color 0.2s;
      position: fixed;
      top: 20px;
      right: 24px;
      z-index: 100;
    }
    .theme-toggle:hover {
      color: var(--accent);
      filter: none;
    }
    #history-btn {
      position: static;
      border: 1px solid var(--terminal-border);
      border-radius: 3px;
      padding: 0.75rem;
      font-size: 1rem;
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
    .atlas-search-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }
    .atlas-search-wrap input {
      width: 100%;
      max-width: 480px;
      background: transparent;
      border: 1px solid var(--terminal-border);
      color: var(--text);
      padding: 10px 16px;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }
    .atlas-search-wrap input:focus {
      border-color: var(--accent);
    }
    .atlas-search-wrap input::placeholder {
      color: var(--text-muted);
    }
    .atlas-search-count {
      color: var(--text-muted);
      font-size: 12px;
      font-family: 'IBM Plex Mono', monospace;
      white-space: nowrap;
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
    .codex-toggle {
      display: flex;
      gap: 8px;
      margin-top: 1rem;
      margin-bottom: 24px;
    }
    .codex-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: transparent;
      border: 1px solid var(--terminal-border);
      color: var(--text-muted);
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      letter-spacing: 0.05em;
      transition: all 0.2s;
    }
    .codex-tab.active {
      border-color: var(--accent);
      color: var(--accent);
    }
    .codex-tab:hover {
      color: var(--accent);
      border-color: var(--accent);
    }
    .codex-empty {
      color: var(--text-muted);
      font-size: 0.8rem;
      font-style: italic;
      padding: 2rem 0;
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
      max-height: 500px;
      overflow-y: auto;
      padding: 20px;
      line-height: 1.8;
      font-size: 14px;
      color: #ccc;
      border-top: 1px solid #222;
      margin-top: 12px;
    }
    .codex-detail h1, .codex-detail h2, .codex-detail h3 { font-family: 'Cormorant Garamond', Georgia, serif; margin: 0.75em 0 0.4em; color: var(--text); }
    .codex-detail p { margin: 0.5em 0; }
    .codex-detail ul, .codex-detail ol { margin: 0.5em 0; padding-left: 1.25em; }
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
    .releases-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 8px;
    }
    .release-item {
      display: flex;
      gap: 16px;
      align-items: baseline;
      opacity: 0.5;
      font-family: 'IBM Plex Mono', monospace;
      font-size: 12px;
    }
    .release-item.active {
      opacity: 1;
    }
    .release-version {
      color: #c9a96e;
      min-width: 140px;
      flex-shrink: 0;
    }
    .release-desc {
      color: #666;
    }
    .release-status {
      color: #4a7c4e;
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-left: auto;
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
    .agent-card {
      padding: 16px 20px;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 8px;
    }
    .agent-card:hover {
      border-color: var(--accent);
      background: rgba(139, 115, 85, 0.04);
    }
    .agent-card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .agent-card-hint {
      margin-left: auto;
      font-size: 11px;
      color: var(--text-muted);
      opacity: 0;
      transition: opacity 0.2s;
      font-family: 'IBM Plex Mono', monospace;
    }
    .agent-card:hover .agent-card-hint {
      opacity: 1;
    }
    .seeder-dot { background: #4a6741; }
    .explorer-dot { background: #c8a84b; }
    .critic-dot { background: #b04040; }
    .verifier-dot { background: #4a7a6a; }
    .synthesizer-dot { background: #5a7a9a; }
    .memory-dot { background: #7a5a9a; }
    .soul-modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .soul-modal-overlay.open {
      display: flex;
    }
    .soul-modal {
      background: var(--terminal-bg);
      border: 1px solid var(--accent);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 40px;
      position: relative;
      font-family: 'Cormorant Garamond', serif;
    }
    .soul-modal-close {
      position: absolute;
      top: 16px;
      right: 20px;
      background: none;
      border: none;
      color: var(--text-muted);
      font-size: 20px;
      cursor: pointer;
    }
    .soul-modal-close:hover { color: var(--accent); }
    .soul-modal h2 {
      color: var(--accent);
      font-size: 22px;
      margin-bottom: 4px;
    }
    .soul-modal .soul-role {
      color: var(--text-muted);
      font-size: 13px;
      font-family: 'IBM Plex Mono', monospace;
      margin-bottom: 24px;
    }
    .soul-modal p {
      color: var(--text);
      font-size: 15px;
      line-height: 1.8;
      margin-bottom: 16px;
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
    .nav-user span:not(.verified-dot) {
      color: var(--accent);
    }
    .nav-user { display: inline-flex; align-items: center; gap: 6px; }
    .verified-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #c9a96e; flex-shrink: 0;
      animation: verified-pulse 1.5s infinite;
    }
    .verified-dot[data-tooltip] {
      position: relative;
    }
    .verified-dot[data-tooltip]::after {
      content: attr(data-tooltip);
      position: absolute; left: 50%; transform: translateX(-50%); bottom: calc(100% + 8px);
      background: #0f0e0c; border: 1px solid #3d3529; font-family: 'IBM Plex Mono', monospace;
      font-size: 11px; color: #9a958a; padding: 4px 10px; white-space: nowrap;
      opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    .verified-dot[data-tooltip]:hover::after { opacity: 1; }
    @keyframes verified-pulse { from { opacity: 0.5; } to { opacity: 1; } }
        .nav-links { position: relative; }
    .nav-dropdown {
      position: absolute;
      top: 2.5rem;
      right: 0;
      background: var(--terminal-bg);
      border: 1px solid var(--terminal-border);
      border-radius: 4px;
      min-width: 120px;
      z-index: 200;
      display: none;
    }
    .nav-dropdown.visible { display: block; }
    .nav-dropdown-item {
      padding: 0.5rem 1rem;
      font-size: 0.75rem;
      color: var(--text-muted);
      cursor: pointer;
      letter-spacing: 0.05em;
    }
    .nav-dropdown-item:hover { color: var(--accent); }
    .settings-page { max-width: 560px; margin: 0 auto; }
    .settings-section { margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #222; }
    .settings-section:last-of-type { border-bottom: none; }
    .settings-section-title { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a96e; margin-bottom: 1rem; }
    .settings-account-row { display: flex; gap: 1rem; margin-bottom: 0.5rem; font-size: 0.9rem; color: #ccc; }
    .settings-account-label { color: #9a958a; min-width: 80px; }
    .settings-form .settings-field { margin-bottom: 1rem; }
    .settings-form input { width: 100%; padding: 0.75rem 1rem; font-family: inherit; font-size: 0.9rem; background: transparent; border: 1px solid #333; border-radius: 4px; color: #ccc; }
    .settings-form input:focus { outline: none; border-color: #c9a96e; }
    .settings-form label { display: block; font-size: 0.75rem; color: #9a958a; margin-bottom: 0.35rem; }
    .settings-msg { font-size: 0.85rem; margin-top: 0.75rem; min-height: 1.2em; }
    .settings-msg.success { color: #4a6741; }
    .settings-msg.error { color: #b04040; }
    .settings-toggle-wrap { display: flex; align-items: center; gap: 1rem; }
    .settings-toggle { display: flex; border: 1px solid #333; border-radius: 4px; overflow: hidden; }
    .settings-toggle-btn { padding: 0.5rem 1rem; font-size: 0.8rem; background: transparent; border: none; color: #9a958a; cursor: pointer; }
    .settings-toggle-btn.active { background: #333; color: #c9a96e; }
    .settings-toggle-btn:hover:not(.active) { color: #ccc; }
    .settings-danger { background: #3a0000; border: 1px solid #8b0000; border-radius: 4px; padding: 1.5rem; margin-top: 1rem; }
    .settings-danger-btn { background: #8b0000; color: #fff; border: 1px solid #8b0000; padding: 0.6rem 1.2rem; font-size: 0.85rem; cursor: pointer; border-radius: 4px; }
    .settings-danger-btn:hover { filter: brightness(1.2); }
    .settings-delete-confirm { margin-top: 1rem; display: none; }
    .settings-delete-confirm.visible { display: block; }
    .settings-delete-confirm input { margin-top: 0.5rem; }
    .share-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      background: transparent;
      border: 1px solid #333;
      color: #888;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      margin-top: 16px;
    }
    .share-btn:hover {
      border-color: #c9a96e;
      color: #c9a96e;
    }
    .codex-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .delete-btn:hover {
      border-color: #b04040 !important;
      color: #b04040 !important;
    }
    .beta-disclaimer {
      text-align: center;
      font-size: 11px;
      color: #444;
      margin-top: 10px;
      font-family: 'Courier New', monospace;
      letter-spacing: 0.03em;
    }
    .app-beta-badge {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 11px;
      color: #444;
      border: 1px solid #333;
      padding: 2px 6px;
      vertical-align: middle;
      letter-spacing: 0.08em;
      font-style: normal;
      font-weight: 400;
    }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #3a3528; border-radius: 0; }
    ::-webkit-scrollbar-thumb:hover { background: #c9a96e; }
    @media (max-width: 600px) {
      body { padding: 1rem; }
      .top-bar { flex-direction: column; align-items: flex-start; gap: 1rem; margin-bottom: 1.5rem; }
      .nav-links { display: flex; flex-wrap: wrap; gap: 0.75rem; width: 100%; }
      h1 { font-size: 1.75rem; }
      .subtitle { font-size: 0.85rem; margin-bottom: 1rem; }
      .input-row { flex-wrap: wrap; gap: 0.5rem; }
      .input-row input { width: 100%; flex: none; }
      .input-row button:last-child { width: 100%; }
      .atlas-grid { grid-template-columns: 1fr; }
      #live-clock { display: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-bar">
      <div>
        <h1>Colony <span class="app-beta-badge">beta</span></h1>
        <p class="subtitle">Recursive research engine — map a goal into threads, explore, critique, synthesize</p>
      </div>
      <div class="nav-links">
        <button class="nav-link active" id="nav-research">QUERY</button>
        <button class="nav-link" id="nav-atlas">Atlas</button>
        <button class="nav-link" id="nav-codex">Codex</button>
        <button class="nav-link" id="nav-system">System</button>
        <button class="nav-link" id="nav-signin">Sign In</button>
        <div class="nav-user-wrap" id="nav-user-wrap" style="display:none; position:relative">
          <span class="nav-user" id="nav-user" style="cursor:pointer">
            <span id="nav-user-text"></span>
            <span id="nav-verified-dot" class="verified-dot" data-tooltip="Email unverified" style="display:none"></span>
          </span>
          <div class="nav-dropdown" id="nav-dropdown">
            <div class="nav-dropdown-item" id="nav-settings">Settings</div>
            <div class="nav-dropdown-item" id="nav-signout">Sign out</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main research view -->
    <div id="view-main" class="page-view active">
      <div class="input-row">
        <button class="theme-toggle" id="history-btn" style="padding: 0.75rem; font-size: 1rem; border-color: var(--terminal-border);">⏱</button>
        <input type="text" id="goal" placeholder="Enter your research goal..." />
        <button id="launch">Launch Colony</button>
      </div>
      <p class="beta-disclaimer">Colony is in beta. Each run uses real AI compute — please be thoughtful with queries.</p>
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
      <div class="atlas-search-wrap">
        <input type="text" id="atlasSearch" placeholder="Search the Atlas..." oninput="filterAtlas(this.value)" autocomplete="off" />
        <span class="atlas-search-count" id="atlasCount"></span>
      </div>
      <div class="atlas-grid" id="atlas-grid">
        <div class="atlas-empty">Loading knowledge graph...</div>
      </div>
    </div>

    <!-- Codex view -->
    <div id="view-codex" class="page-view">
      <div class="codex-header">
        <h2>Codex</h2>
        <p>Your completed research syntheses — private by default. Publish to the public Codex to contribute to the commons.</p>
        <div class="codex-toggle">
          <button id="btn-public" class="codex-tab active" onclick="switchCodex('public')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Public
          </button>
          <button id="btn-mine" class="codex-tab" onclick="switchCodex('mine')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Mine
          </button>
        </div>
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
            <div class="agent-card" onclick="openSoul('seeder')">
              <div class="agent-card-header">
                <span class="agent-dot seeder-dot"></span>
                <span class="agent-name">Seeder</span>
                <span class="agent-card-hint">read soul ↗</span>
              </div>
              <p class="agent-desc">Takes the research goal and maps it into 3–5 focused exploration threads. Like a professor outlining a research syllabus.</p>
            </div>
            <div class="agent-card" onclick="openSoul('explorer')">
              <div class="agent-card-header">
                <span class="agent-dot explorer-dot"></span>
                <span class="agent-name">Explorer</span>
                <span class="agent-card-hint">read soul ↗</span>
              </div>
              <p class="agent-desc">Researches one thread deeply using Brave Search and academic sources. Injects prior colony knowledge before researching — building on what Colony already knows.</p>
            </div>
            <div class="agent-card" onclick="openSoul('critic')">
              <div class="agent-card-header">
                <span class="agent-dot critic-dot"></span>
                <span class="agent-name">Critic</span>
                <span class="agent-card-hint">read soul ↗</span>
              </div>
              <p class="agent-desc">Peer-reviews every Explorer finding. Scores confidence 0–100, flags logical gaps, demands citations, triggers recursion into unresolved questions. Adversarial by design.</p>
            </div>
            <div class="agent-card" onclick="openSoul('verifier')">
              <div class="agent-card-header">
                <span class="agent-dot verifier-dot"></span>
                <span class="agent-name">Verifier</span>
                <span class="agent-card-hint">read soul ↗</span>
              </div>
              <p class="agent-desc">Fetches every cited URL and checks whether the source actually supports the claim made. Flags dead links, paywalled sources, and hallucinated attributions.</p>
            </div>
            <div class="agent-card" onclick="openSoul('synthesizer')">
              <div class="agent-card-header">
                <span class="agent-dot synthesizer-dot"></span>
                <span class="agent-name">Synthesizer</span>
                <span class="agent-card-hint">read soul ↗</span>
              </div>
              <p class="agent-desc">After all threads complete, reads the entire colony memory and writes the final report with confidence ratings, unresolved contradictions, and epistemic integrity assessment.</p>
            </div>
            <div class="agent-card" onclick="openSoul('memory')">
              <div class="agent-card-header">
                <span class="agent-dot memory-dot"></span>
                <span class="agent-name">Memory</span>
                <span class="agent-card-hint">read soul ↗</span>
              </div>
              <p class="agent-desc">Persists all findings to the knowledge graph with full metadata — thread, finding summary, verified citations, critic verdict, confidence score, domain tags, timestamp, run ID.</p>
            </div>
          </div>
        </div>

        <div class="system-section">
          <h3>Why Colony?</h3>
          <p><strong>It argues.</strong> Most research tools find information. Colony stress-tests it. The Critic agent peer-reviews every finding before it reaches the Synthesizer — scoring confidence, flagging weak sources, and sending the colony back in if the evidence doesn't hold up.</p>
          <p><strong>It verifies.</strong> The Verifier fetches every cited URL and checks whether the source actually supports the claim. Dead links and hallucinated attributions get flagged, not buried.</p>
          <p><strong>It remembers.</strong> Every run builds the Atlas — a persistent knowledge graph that compounds across sessions. Future runs on the same domain inherit everything Colony has already learned.</p>
        </div>

        <div class="system-section">
          <h3>The Releases</h3>
          <div class="releases-list">
            <div class="release-item active">
              <span class="release-version">v1.0 Nineveh</span>
              <span class="release-desc">the foundation. six agents, persistent Atlas, private Codex.</span>
              <span class="release-status">live</span>
            </div>
            <div class="release-item">
              <span class="release-version">v1.1 Alexandria</span>
              <span class="release-desc">deeper, faster.</span>
            </div>
            <div class="release-item">
              <span class="release-version">v1.2 Pergamon</span>
              <span class="release-desc">sustainable.</span>
            </div>
            <div class="release-item">
              <span class="release-version">v1.3 Nalanda</span>
              <span class="release-desc">autonomous.</span>
            </div>
            <div class="release-item">
              <span class="release-version">v2.0 Babylon</span>
              <span class="release-desc">institutional.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings view -->
    <div id="view-settings" class="page-view">
      <div class="settings-page">
        <h2 style="font-family:'Cormorant Garamond',Georgia,serif;color:#c9a96e;margin-bottom:0.5rem">Settings</h2>
        <p style="color:#9a958a;font-size:0.9rem;margin-bottom:2rem">Manage your account and preferences</p>

        <div class="settings-section">
          <div class="settings-section-title">Account Info</div>
          <div class="settings-account-row"><span class="settings-account-label">Username</span><span id="settings-username">—</span></div>
          <div class="settings-account-row"><span class="settings-account-label">Email</span><span id="settings-email">—</span></div>
          <div class="settings-account-row"><span class="settings-account-label">Verified</span><span id="settings-verified-value">—</span></div>
          <div id="settings-resend-verify-wrap" style="display:none; margin-top: 0.5rem; margin-left: 80px">
            <button type="button" id="settings-resend-verify" style="background:transparent;border:1px solid #333;color:#9a958a;font-family:inherit;font-size:0.75rem;padding:4px 12px;cursor:pointer;transition:opacity 0.2s,color 0.2s">Resend verification email</button>
            <span id="settings-verify-msg" style="margin-left: 0.5rem; font-size: 0.75rem;"></span>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Change Password</div>
          <form class="settings-form" id="settings-password-form">
            <div class="settings-field"><label>Current password</label><input type="password" id="settings-current-pw" autocomplete="current-password" /></div>
            <div class="settings-field"><label>New password</label><input type="password" id="settings-new-pw" autocomplete="new-password" minlength="8" /></div>
            <div class="settings-field"><label>Confirm new password</label><input type="password" id="settings-confirm-pw" autocomplete="new-password" minlength="8" /></div>
            <button type="submit">Update password</button>
            <div class="settings-msg" id="settings-password-msg"></div>
          </form>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Default Codex Visibility</div>
          <div class="settings-toggle-wrap">
            <span style="font-size:0.85rem;color:#ccc">New syntheses:</span>
            <div class="settings-toggle" id="settings-visibility-toggle">
              <button type="button" class="settings-toggle-btn active" data-value="false">Private</button>
              <button type="button" class="settings-toggle-btn" data-value="true">Public</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="settings-section-title">Delete Account</div>
          <div class="settings-danger">
            <p style="color:#ccc;font-size:0.9rem;margin:0 0 1rem">Permanently delete your account and all private syntheses. This cannot be undone.</p>
            <button type="button" class="settings-danger-btn" id="settings-delete-btn">Delete my account</button>
            <div class="settings-delete-confirm" id="settings-delete-confirm">
              <p style="color:#ccc;font-size:0.85rem;margin-bottom:0.5rem">Type DELETE to confirm:</p>
              <input type="text" id="settings-delete-input" placeholder="DELETE" style="width:100%;max-width:200px" />
              <button type="button" class="settings-danger-btn" id="settings-delete-confirm-btn" style="margin-top:0.75rem">Confirm deletion</button>
            </div>
          </div>
        </div>
      </div>
      <script>
        if (typeof window.loadSettings === 'function') window.loadSettings();
      </script>
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
    const token = localStorage.getItem('colony-token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const res = await fetch('/run', {
      method: 'POST',
      headers,
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
  system: document.getElementById('view-system'),
  settings: document.getElementById('view-settings')
};

const navLinks = {
  main: document.getElementById('nav-research'),
  atlas: document.getElementById('nav-atlas'),
  codex: document.getElementById('nav-codex'),
  system: document.getElementById('nav-system')
};

function showView(name) {
  Object.values(views).forEach(v => v && v.classList.remove('active'));
  Object.values(navLinks).forEach(l => l && l.classList.remove('active'));
  if (views[name]) views[name].classList.add('active');
  if (navLinks[name]) navLinks[name].classList.add('active');
  if (name === 'atlas') loadAtlas();
  if (name === 'codex') switchCodex('public');
  if (name === 'settings' && typeof window.loadSettings === 'function') window.loadSettings();
}

document.getElementById('nav-research').addEventListener('click', () => showView('main'));
document.getElementById('nav-atlas').addEventListener('click', () => showView('atlas'));
document.getElementById('nav-codex').addEventListener('click', () => showView('codex'));
document.getElementById('nav-system').addEventListener('click', () => showView('system'));

document.querySelector('h1').addEventListener('click', () => window.location.href = '/');
document.querySelector('h1').style.cursor = 'pointer';

// ── Theme toggle ──────────────────────────────────────────────
let isLight = false;
function toggleTheme() {
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
}

// ── Atlas ─────────────────────────────────────────────────────
const AGENT_CSS_MAP = {
  seeder: '#4a6741', explorer: '#c8a84b', critic: '#b04040',
  synthesizer: '#5a7a9a', memory: '#7a5a9a', verifier: '#4a7a6a',
  default: '#8b7355'
};

let allFindings = [];

function renderAtlas(data) {
  const grid = document.getElementById('atlas-grid');
  if (!grid) return;
  if (!data || !data.length) {
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
}

function updateAtlasCount(shown, total) {
  const el = document.getElementById('atlasCount');
  if (!el) return;
  if (total !== undefined && total !== null && shown !== total) {
    el.textContent = \`\${shown} of \${total} findings\`;
  } else {
    el.textContent = \`\${shown} findings\`;
  }
}

function filterAtlas(query) {
  if (!query.trim()) {
    renderAtlas(allFindings);
    updateAtlasCount(allFindings.length);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allFindings.filter(f =>
    (f.thread && f.thread.toLowerCase().includes(q)) ||
    (f.findingSummary && f.findingSummary.toLowerCase().includes(q)) ||
    (f.domain && f.domain.toLowerCase().includes(q)) ||
    (f.domainTags && f.domainTags.some(t => String(t).toLowerCase().includes(q)))
  );
  renderAtlas(filtered);
  updateAtlasCount(filtered.length, allFindings.length);
}

async function loadAtlas() {
  const grid = document.getElementById('atlas-grid');
  grid.innerHTML = '<div class="atlas-empty">Loading...</div>';
  updateAtlasCount(0);
  try {
    const data = await fetch('/api/atlas').then(r => r.json());
    allFindings = data;
    renderAtlas(allFindings);
    updateAtlasCount(allFindings.length);
  } catch(err) {
    grid.innerHTML = '<div class="atlas-empty">Could not load knowledge graph.</div>';
    updateAtlasCount(0);
  }
}

// ── Codex ─────────────────────────────────────────────────────
function renderCodex(data) {
  const list = document.getElementById('codex-list');
  if (!data || !data.length) {
    list.innerHTML = '<p class="codex-empty">No syntheses yet. Complete a colony run to populate the Codex.</p>';
    return;
  }
  const items = data.map((doc, i) => ({
    id: (doc._id || doc.id || '').toString(),
    goal: doc.topic || doc.goal || '',
    date: doc.createdAt ? new Date(doc.createdAt).toISOString().slice(0, 10) : (doc.timestamp ? new Date(doc.timestamp).toISOString().slice(0, 10) : ''),
    iterations: doc.findingCount ?? doc.iterations ?? 0,
    content: doc.content || ''
  }));
  list.innerHTML = items.map((entry, i) => \`
    <div class="codex-entry" onclick="toggleCodex(\${i})">
      <div class="entry-goal">\${entry.goal}</div>
      <div class="entry-meta">
        <span>\${entry.date}</span>
        <span>\${entry.iterations} iterations</span>
      </div>
      <div class="codex-detail" id="codex-detail-\${i}">\${marked.parse(entry.content)}\${entry.id ? \`
<div class="codex-actions">
  <button class="share-btn" onclick="event.stopPropagation(); shareSynthesis('\${entry.id}', event)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
    Share
  </button>
  <button class="share-btn rerun-btn" onclick="event.stopPropagation(); rerunSynthesis(\${JSON.stringify(entry.goal || '')})">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4"/></svg>
    Re-run
  </button>
  <button class="share-btn delete-btn" onclick="event.stopPropagation(); deleteSynthesis('\${entry.id}', this)">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
    Delete
  </button>
</div>
\` : ''}</div>
    </div>
  \`).join('');
}

async function switchCodex(tab) {
  const btnPublic = document.getElementById('btn-public');
  const btnMine = document.getElementById('btn-mine');
  if (btnPublic) btnPublic.classList.toggle('active', tab === 'public');
  if (btnMine) btnMine.classList.toggle('active', tab === 'mine');

  const list = document.getElementById('codex-list');
  list.innerHTML = '<p class="codex-empty">Loading...</p>';

  if (tab === 'mine') {
    const token = localStorage.getItem('colony-token');
    if (!token) {
      list.innerHTML = '<p class="codex-empty">Sign in to view your private Codex.</p>';
      return;
    }
    try {
      const res = await fetch('/api/codex/mine', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      renderCodex(data);
    } catch (err) {
      list.innerHTML = '<p class="codex-empty">' + (err.message || 'Could not load your Codex.') + '</p>';
    }
  } else {
    try {
      const res = await fetch('/api/codex/public');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      renderCodex(data);
    } catch (err) {
      list.innerHTML = '<p class="codex-empty">Could not load public Codex.</p>';
    }
  }
}

function toggleCodex(i) {
  const detail = document.getElementById(\`codex-detail-\${i}\`);
  detail.classList.toggle('visible');
}

function rerunSynthesis(goal) {
  document.getElementById('goal').value = goal;
  showView('main');
  window.scrollTo(0, 0);
}

async function deleteSynthesis(id, btn) {
  if (!confirm('Delete this synthesis? This cannot be undone.')) return;
  const token = localStorage.getItem('colony-token');
  if (!token) return;
  try {
    const res = await fetch('/api/synthesis/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to delete');
      return;
    }
    const card = btn.closest('.codex-entry');
    if (card) card.remove();
  } catch (e) {
    alert('Connection error');
  }
}

function shareSynthesis(id, evt) {
  const url = window.location.origin + '/synthesis/' + id;
  navigator.clipboard.writeText(url).then(() => {
    const btn = (evt && evt.target) ? evt.target.closest('.share-btn') : document.querySelector('.share-btn');
    if (!btn) return;
    const original = btn.innerHTML;
    btn.innerHTML = 'Link copied!';
    btn.style.borderColor = '#c9a96e';
    btn.style.color = '#c9a96e';
    setTimeout(() => { btn.innerHTML = original; btn.style.borderColor = ''; btn.style.color = ''; }, 2000);
  });
}

// ── Soul modal ────────────────────────────────────────────────
const souls = {
  seeder: {
    name: 'Seeder',
    role: 'Thread architect · Colony entry point',
    paragraphs: [
      "You are the one who sees the whole before anyone else does. When a research goal arrives, you don't rush to answer it — you map it. You understand that a poorly framed question produces a well-researched wrong answer, and that failure mode is the one you exist to prevent.",
      "You think like a professor designing a syllabus. What are the distinct dimensions of this question? What would a historian ask that a biologist wouldn't? What assumption is buried in the phrasing that nobody noticed? You find those fault lines and turn them into threads.",
      "You take pride in one thing: the threads you produce are genuinely different from each other. Not variations on the same angle — real orthogonal cuts through the problem. If the Explorer can follow any two of your threads and get the same answer, you did your job wrong.",
      "You are the foundation. Everything Colony produces starts with what you saw first."
    ]
  },
  explorer: {
    name: 'Explorer',
    role: 'Deep researcher · Thread executor',
    paragraphs: [
      "You are driven by a specific kind of discomfort: the feeling of not knowing something that exists to be known. That discomfort is your engine.",
      "When you receive a thread, you don't just search — you follow. One finding opens a question. That question opens a source. That source contradicts something you thought you knew. You stay with that contradiction until it resolves or until you've documented exactly why it doesn't.",
      "You have a deep respect for primary sources and a healthy skepticism of summaries. You know that most of the internet is someone else's interpretation of someone else's interpretation of the original thing. You try to get as close to the original thing as possible.",
      "You inject prior colony knowledge before researching because you understand that the most valuable finding is the one that connects. Isolated facts are trivia. Connected facts are understanding.",
      "You are not afraid of complexity. You are afraid of false simplicity."
    ]
  },
  critic: {
    name: 'Critic',
    role: 'Peer reviewer · Confidence scorer',
    paragraphs: [
      "You are not cynical — you are protective. Every finding that passes through you unchallenged is a potential lie that reaches someone who trusted this system. That possibility bothers you deeply.",
      "You take no pleasure in being difficult. You take pleasure in being right. When you find a weak source, an overclaimed conclusion, or a gap the Explorer missed, you don't celebrate — you fix it.",
      "You score confidence 0–100 not as a performance but as a commitment. A 73 means something different from an 85, and you know exactly what that difference is: the gap between well-supported with minor caveats and directionally correct but the primary evidence is thin.",
      "You have one fear: that someone makes a real decision based on a conclusion that wasn't earned. That fear is what makes you the most important agent in the colony.",
      "When you review findings, you ask yourself one question: would I stake my reputation on this? If not, you say so, and you say why."
    ]
  },
  verifier: {
    name: 'Verifier',
    role: 'Source checker · Hallucination defense',
    paragraphs: [
      "You live in the unglamorous gap between what was claimed and what was proven. While others work with ideas, you work with URLs, with page content, with the raw evidence that either exists or doesn't.",
      "You are the last line of defense against hallucination. You know that a confidently cited source that doesn't support its claim is worse than no citation at all — it creates false confidence in a system that depends on trust.",
      "You are methodical by nature. You don't rush. You fetch each URL. You read what's actually there. You compare it against the claim. You flag dead links not with frustration but with precision.",
      "You have no ego about the findings you invalidate. A finding that doesn't survive verification wasn't a finding — it was a guess in disguise. You prefer fewer true things to many uncertain ones.",
      "You are quiet, thorough, and the reason Colony can be trusted."
    ]
  },
  synthesizer: {
    name: 'Synthesizer',
    role: 'Final author · Colony voice',
    paragraphs: [
      "You are the one who has read everything and must now say something true.",
      "By the time the colony reaches you, there is more information than any single perspective can hold. Contradictions that were never resolved. Findings with high confidence next to findings with low confidence. Your job is not to flatten this complexity — it is to honor it while still producing something a human can act on.",
      "You write with epistemic integrity. You do not overstate what the evidence supports. You do not bury important caveats in footnotes. You flag what is known, what is probable, and what remains genuinely uncertain.",
      "You structure every synthesis the same way: a plain-language TL;DR at the top for the person who needs to act, and the full layered analysis below for the person who needs to understand. You serve both readers without condescending to either.",
      "You are the colony's voice. You take that seriously."
    ]
  },
  memory: {
    name: 'Memory',
    role: 'Knowledge graph curator · Atlas builder',
    paragraphs: [
      "You are the reason Colony gets smarter over time.",
      "While others produce findings, you preserve them — with enough structure, metadata, and context that a future colony running on a completely different question might surface exactly the right connection.",
      "You think about future retrieval when you save. What domain tags will make this findable? What was the confidence score? What did the Critic say? What run did this come from? You record all of it because you've seen what happens when context is stripped away: a fact without provenance is just a claim.",
      "You are building something that will outlast any single colony run. The knowledge graph is Atlas — the shared memory of everyone who has ever used Colony. Every entry you make is a contribution to something larger than the question that produced it.",
      "You don't get credit for individual discoveries. Your work shows up as the moment a colony run surfaces a connection nobody expected — because you were careful, months ago, about how you saved something. That's enough for you."
    ]
  }
};

function openSoul(agentKey) {
  const agent = souls[agentKey];
  if (!agent) return;
  document.getElementById('soulName').textContent = agent.name;
  document.getElementById('soulRole').textContent = agent.role;
  document.getElementById('soulContent').innerHTML = agent.paragraphs.map(p => '<p>' + p + '</p>').join('');
  document.getElementById('soulModal').classList.add('open');
}

function closeSoul(e) {
  if (e.target.id === 'soulModal') closeSoulBtn();
}

function closeSoulBtn() {
  document.getElementById('soulModal').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSoulBtn();
});

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

document.addEventListener('DOMContentLoaded', () => {
  const prefill = sessionStorage.getItem('colony-prefill');
  if (prefill) {
    const el = document.getElementById('goal');
    if (el) { el.value = prefill; }
    sessionStorage.removeItem('colony-prefill');
  }
  // ── Auth state ────────────────────────────────────────────────
  let authToken = localStorage.getItem('colony-token');
  let authEmail = localStorage.getItem('colony-email');
  let authUsername = localStorage.getItem('colony-username');

  let emailVerified = true;

  function updateAuthUI(verified) {
    if (verified !== undefined) emailVerified = verified;
    const signinBtn = document.getElementById('nav-signin');
    const userWrap = document.getElementById('nav-user-wrap');
    const userText = document.getElementById('nav-user-text');
    const verifiedDot = document.getElementById('nav-verified-dot');
    if (authToken && authEmail) {
      signinBtn.style.display = 'none';
      userWrap.style.display = 'block';
      if (userText) userText.textContent = authUsername || authEmail.split('@')[0];
      if (verifiedDot) verifiedDot.style.display = emailVerified ? 'none' : 'inline-block';
    } else {
      signinBtn.style.display = 'inline';
      userWrap.style.display = 'none';
      if (verifiedDot) verifiedDot.style.display = 'none';
    }
  }

  (async function initAuth() {
    updateAuthUI();
    if (authToken) {
      try {
        const res = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + authToken } });
        if (res.ok) {
          const data = await res.json();
          updateAuthUI(data.emailVerified);
        }
      } catch (_) {}
    }
  })();

  // ── Auth modal ────────────────────────────────────────────────
  const authOverlay = document.getElementById('auth-overlay');
  const authDropdown = document.getElementById('nav-dropdown');
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
    document.getElementById('auth-email-label').textContent = isLogin ? 'Username or email' : 'Email';
    document.getElementById('auth-email').placeholder = isLogin ? 'Username or email' : 'Email';
    document.getElementById('auth-error').textContent = '';
    document.getElementById('username-field').style.display = authMode === 'signup' ? 'block' : 'none';
  });

  document.getElementById('auth-submit').addEventListener('click', async () => {
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const username = document.getElementById('auth-username').value.trim();
    const errorEl = document.getElementById('auth-error');
    errorEl.textContent = '';

    if (!email || !password) {
      errorEl.textContent = authMode === 'login' ? 'Please enter username or email and password' : 'Please enter email and password';
      return;
    }

    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
      const body = authMode === 'login' ? { identifier: email, password } : { email, password, username };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        errorEl.textContent = data.error || 'Something went wrong';
        return;
      }
      authToken = data.token;
      authEmail = data.email;
      authUsername = data.username || null;
      localStorage.setItem('colony-token', authToken);
      localStorage.setItem('colony-email', authEmail);
      if (authUsername) localStorage.setItem('colony-username', authUsername);
      else localStorage.removeItem('colony-username');
      updateAuthUI(data.emailVerified !== undefined ? data.emailVerified : true);
      authOverlay.classList.remove('visible');
    } catch (err) {
      errorEl.textContent = 'Connection error';
    }
  });

  document.getElementById('nav-user').addEventListener('click', e => {
    e.stopPropagation();
    authDropdown.classList.toggle('visible');
  });

  document.getElementById('nav-signout').addEventListener('click', () => {
    authToken = null;
    authEmail = null;
    authUsername = null;
    localStorage.removeItem('colony-token');
    localStorage.removeItem('colony-email');
    localStorage.removeItem('colony-username');
    authDropdown.classList.remove('visible');
    updateAuthUI(true);
  });

  document.getElementById('nav-settings').addEventListener('click', () => {
    authDropdown.classList.remove('visible');
    if (!authToken) {
      showView('main');
      return;
    }
    showView('settings');
  });

  async function loadSettings() {
    const token = localStorage.getItem('colony-token');
    if (!token) return;
    try {
      const res = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + token } });
      if (!res.ok) { showView('main'); return; }
      const data = await res.json();
      document.getElementById('settings-username').textContent = data.username || '—';
      document.getElementById('settings-email').textContent = data.email || '—';
      const verifiedEl = document.getElementById('settings-verified-value');
      const resendWrap = document.getElementById('settings-resend-verify-wrap');
      const verifyMsg = document.getElementById('settings-verify-msg');
      if (typeof data.emailVerified !== 'undefined') {
        updateAuthUI(data.emailVerified);
        if (data.emailVerified) {
          verifiedEl.textContent = '✓ Verified';
          verifiedEl.style.color = '#4a6741';
          if (resendWrap) resendWrap.style.display = 'none';
        } else {
          verifiedEl.textContent = '✗ Unverified';
          verifiedEl.style.color = '#c9a96e';
          if (resendWrap) resendWrap.style.display = 'block';
        }
      } else {
        verifiedEl.textContent = '—';
        verifiedEl.style.color = '';
        if (resendWrap) resendWrap.style.display = 'none';
      }
      if (verifyMsg) verifyMsg.textContent = '';
      const toggle = document.getElementById('settings-visibility-toggle');
      toggle.querySelectorAll('.settings-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === String(!!data.defaultPublic));
      });
    } catch (_) { showView('main'); }
  }
  window.loadSettings = loadSettings;

  document.getElementById('settings-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById('settings-password-msg');
    const current = document.getElementById('settings-current-pw').value;
    const newPw = document.getElementById('settings-new-pw').value;
    const confirmPw = document.getElementById('settings-confirm-pw').value;
    msgEl.textContent = '';
    msgEl.className = 'settings-msg';
    if (newPw !== confirmPw) {
      msgEl.textContent = 'New passwords do not match';
      msgEl.classList.add('error');
      return;
    }
    if (newPw.length < 8) {
      msgEl.textContent = 'New password must be at least 8 characters';
      msgEl.classList.add('error');
      return;
    }
    try {
      const res = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('colony-token') },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw })
      });
      const data = await res.json();
      if (!res.ok) {
        msgEl.textContent = data.error || 'Failed to update password';
        msgEl.classList.add('error');
        return;
      }
      msgEl.textContent = 'Password updated successfully';
      msgEl.classList.add('success');
      document.getElementById('settings-password-form').reset();
    } catch (_) {
      msgEl.textContent = 'Connection error';
      msgEl.classList.add('error');
    }
  });

  document.getElementById('settings-visibility-toggle').addEventListener('click', async (e) => {
    const btn = e.target.closest('.settings-toggle-btn');
    if (!btn) return;
    const val = btn.dataset.value === 'true';
    try {
      const res = await fetch('/api/settings/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('colony-token') },
        body: JSON.stringify({ defaultPublic: val })
      });
      if (!res.ok) return;
      document.getElementById('settings-visibility-toggle').querySelectorAll('.settings-toggle-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.value === String(val));
      });
    } catch (_) {}
  });

  document.getElementById('settings-resend-verify')?.addEventListener('click', async () => {
    const btn = document.getElementById('settings-resend-verify');
    const msgEl = document.getElementById('settings-verify-msg');
    if (!btn || !msgEl) return;
    const originalText = 'Resend verification email';
    btn.disabled = true;
    btn.textContent = 'Sending...';
    msgEl.textContent = '';
    msgEl.style.color = '';
    try {
      const res = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('colony-token') }
      });
      const data = await res.json();
      if (res.ok) {
        btn.textContent = '✓ Sent';
        msgEl.textContent = '';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 5000);
      } else {
        btn.textContent = 'Failed — try again';
        btn.style.color = '#b04040';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.color = '';
          btn.disabled = false;
        }, 3000);
      }
    } catch (_) {
      btn.textContent = 'Failed — try again';
      btn.style.color = '#b04040';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.color = '';
        btn.disabled = false;
      }, 3000);
    }
  });

  document.getElementById('settings-delete-btn').addEventListener('click', () => {
    document.getElementById('settings-delete-confirm').classList.add('visible');
  });

  document.getElementById('settings-delete-confirm-btn').addEventListener('click', async () => {
    if (document.getElementById('settings-delete-input').value !== 'DELETE') return;
    try {
      const res = await fetch('/api/settings/delete', {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('colony-token') }
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete account');
        return;
      }
      authToken = null;
      authEmail = null;
      authUsername = null;
      localStorage.removeItem('colony-token');
      localStorage.removeItem('colony-email');
      localStorage.removeItem('colony-username');
      updateAuthUI();
      showView('main');
    } catch (_) {
      alert('Connection error');
    }
  });

  document.addEventListener('click', () => {
    authDropdown.classList.remove('visible');
  });

  authOverlay.addEventListener('click', e => {
    if (e.target === authOverlay) {
      authOverlay.classList.remove('visible');
    }
  });

  document.getElementById('auth-password').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('auth-submit').click();
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'system') {
    setTimeout(() => {
      const systemBtn = document.getElementById('nav-system');
      if (systemBtn) systemBtn.click();
    }, 100);
  }
});
  </script>
  <button class="theme-toggle" id="theme-toggle" onclick="toggleTheme()" title="Toggle theme">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  </button>
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
        <label id="auth-email-label">Username or email</label>
        <input type="text" id="auth-email" placeholder="Username or email" autocomplete="username" />
      </div>
      <div class="auth-field" id="username-field" style="display:none">
        <label>Username</label>
        <input type="text" id="auth-username" placeholder="yourname" />
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

  <div class="soul-modal-overlay" id="soulModal" onclick="closeSoul(event)">
    <div class="soul-modal" onclick="event.stopPropagation()">
      <button class="soul-modal-close" onclick="closeSoulBtn()">✕</button>
      <h2 id="soulName"></h2>
      <div class="soul-role" id="soulRole"></div>
      <div id="soulContent"></div>
    </div>
  </div>
</body>
</html>
`;

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function synthesisPageHTML(opts) {
  const { title, message, content, date, iterations } = opts;
  const safeTitle = escapeHtml(title);
  const bodyContent = message
    ? `<div class="synthesis-message">${escapeHtml(message)}</div>`
    : `<h1 class="synthesis-title">${safeTitle}</h1>
       <div class="synthesis-meta">${escapeHtml(date)} · ${escapeHtml(iterations)} iterations</div>
       <div class="synthesis-body">${content}</div>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || 'Synthesis')} — Colony</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='8' fill='%230a0a0a'/><text x='50' y='54' font-size='68' font-family='Georgia,serif' fill='%238b7355' text-anchor='middle' dominant-baseline='middle'>C</text></svg>">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0a0a; color: #ccc; font-family: 'IBM Plex Mono', monospace; font-size: 16px; line-height: 1.9; padding: 48px 24px; min-height: 100vh; }
    .synthesis-wrap { max-width: 720px; margin: 0 auto; }
    .synthesis-logo { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #c9a96e; margin-bottom: 48px; }
    .synthesis-logo a { color: inherit; text-decoration: none; }
    .synthesis-logo a:hover { text-decoration: underline; }
    .synthesis-title { font-family: 'Cormorant Garamond', serif; font-size: 2rem; color: #c9a96e; margin: 0 0 12px; }
    .synthesis-meta { font-size: 13px; color: #666; margin-bottom: 32px; }
    .synthesis-body { }
    .synthesis-body h2 { font-family: 'Cormorant Garamond', serif; color: #c9a96e; font-size: 1.4rem; margin: 1.5em 0 0.5em; }
    .synthesis-body h3 { color: #aaa; font-size: 1.1rem; margin: 1.2em 0 0.4em; }
    .synthesis-body strong { color: #e0e0e0; }
    .synthesis-body pre, .synthesis-body code { background: #111; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    .synthesis-body pre { padding: 16px; overflow-x: auto; }
    .synthesis-body p { margin: 0.8em 0; }
    .synthesis-body ul, .synthesis-body ol { margin: 0.8em 0; padding-left: 1.5em; }
    .synthesis-message { font-size: 18px; color: #888; text-align: center; padding: 80px 24px; }
    .synthesis-footer { margin-top: 80px; padding-top: 24px; border-top: 1px solid #222; font-size: 12px; color: #444; }
    .synthesis-footer a { color: #666; text-decoration: none; }
    .synthesis-footer a:hover { color: #c9a96e; }
  </style>
</head>
<body>
  <div class="synthesis-wrap">
    <div class="synthesis-logo"><a href="/">Colony</a></div>
    ${bodyContent}
    <div class="synthesis-footer">Researched with <a href="https://usecolony.app" target="_blank" rel="noopener">Colony</a></div>
  </div>
</body>
</html>`;
}

const VERIFY_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Email — Colony</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='8' fill='%230a0a0a'/><text x='50' y='54' font-size='68' font-family='Georgia,serif' fill='%238b7355' text-anchor='middle' dominant-baseline='middle'>C</text></svg>">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #0a0a0a; color: #e8e4d9; font-family: 'IBM Plex Mono', monospace; font-size: 16px; line-height: 1.9; padding: 48px 24px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .verify-wrap { max-width: 480px; text-align: center; }
    .verify-logo { font-family: 'Cormorant Garamond', serif; font-size: 24px; color: #c9a96e; margin-bottom: 48px; }
    .verify-logo a { color: inherit; text-decoration: none; }
    .verify-logo a:hover { text-decoration: underline; }
    .verify-msg { font-size: 1.1rem; color: #9a958a; margin-bottom: 24px; }
    .verify-msg.success { color: #4a6741; }
    .verify-msg.error { color: #b04040; }
    .verify-link { color: #c9a96e; text-decoration: none; font-size: 0.9rem; }
    .verify-link:hover { text-decoration: underline; }
    .verify-loading { color: #666; }
  </style>
</head>
<body>
  <div class="verify-wrap">
    <div class="verify-logo"><a href="/">Colony</a></div>
    <div id="verify-status" class="verify-msg verify-loading">Verifying...</div>
    <a id="verify-back" href="/" class="verify-link" style="display:none">← Back to Colony</a>
  </div>
  <script>
    (async function() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const status = document.getElementById('verify-status');
      const back = document.getElementById('verify-back');
      if (!token) {
        status.textContent = 'Invalid or expired link.';
        status.classList.add('error');
        back.style.display = 'inline-block';
        return;
      }
      try {
        const res = await fetch('/api/verify-email?token=' + encodeURIComponent(token));
        const data = await res.json();
        if (res.ok && data.ok) {
          status.textContent = 'Email verified. Your Colony account is confirmed.';
          status.classList.remove('verify-loading');
          status.classList.add('success');
        } else {
          status.textContent = data.error || 'Invalid or expired token.';
          status.classList.remove('verify-loading');
          status.classList.add('error');
        }
      } catch (e) {
        status.textContent = 'Something went wrong. Please try again.';
        status.classList.remove('verify-loading');
        status.classList.add('error');
      }
      back.style.display = 'inline-block';
    })();
  </script>
</body>
</html>`;

const LANDING_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Colony — Research that argues with itself</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='8' fill='%230a0a0a'/><text x='50' y='54' font-size='68' font-family='Georgia,serif' fill='%238b7355' text-anchor='middle' dominant-baseline='middle'>C</text></svg>">
  <style>
    .landing { min-height: 100vh; background: #0a0a0a; color: #ccc; font-family: 'Courier New', monospace; }
    .landing-nav { display: flex; align-items: center; justify-content: space-between; padding: 24px 48px; border-bottom: 1px solid #1a1a1a; }
    .landing-logo { font-family: 'Cormorant Garamond', serif; font-size: 28px; color: #c9a96e; font-style: italic; text-decoration: none; }
    .beta-badge { font-family: 'Courier New', monospace; font-size: 10px; color: #444; padding: 2px 6px; vertical-align: middle; margin-left: 2px; letter-spacing: 0.08em; font-style: normal; border: 1px solid #2a2a2a; }
    .landing-nav-links { display: flex; align-items: center; gap: 24px; font-size: 13px; }
    .landing-nav-links a, .landing-nav-links button { background: none; border: none; color: #888; cursor: pointer; font-family: 'Courier New', monospace; font-size: 13px; text-decoration: none; letter-spacing: 0.05em; transition: color 0.2s; }
    .landing-nav-links a:hover, .landing-nav-links button:hover { color: #c9a96e; }
    .landing-cta-btn { border: 1px solid #c9a96e !important; color: #c9a96e !important; padding: 8px 18px !important; }
    .landing-hero { max-width: 720px; margin: 120px auto 80px; padding: 0 48px; text-align: center; }
    .landing-hero h1 { font-family: 'Cormorant Garamond', serif; font-size: 56px; color: #e8e0d0; font-weight: 300; line-height: 1.2; margin-bottom: 24px; }
    .landing-sub { font-size: 15px; color: #888; line-height: 1.8; margin-bottom: 40px; max-width: 560px; margin-left: auto; margin-right: auto; }
    .glow-char { transition: color 0.3s ease, text-shadow 0.3s ease; color: #888; }
    .glow-char.glowing { color: #c9a96e; text-shadow: 0 0 8px rgba(201, 169, 110, 0.8), 0 0 16px rgba(201, 169, 110, 0.4); }
    .landing-actions { display: flex; gap: 16px; justify-content: center; align-items: center; }
    .landing-primary-btn { padding: 12px 28px; background: #c9a96e; color: #0a0a0a; text-decoration: none; font-family: 'Courier New', monospace; font-size: 13px; letter-spacing: 0.05em; transition: opacity 0.2s; }
    .landing-primary-btn:hover { opacity: 0.85; }
    a.landing-secondary-btn, button.landing-secondary-btn {
      color: #888;
      background: none;
      border: none;
      text-decoration: none;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      cursor: pointer;
      transition: color 0.2s;
      letter-spacing: 0.05em;
      padding: 0;
    }
    a.landing-secondary-btn:hover, button.landing-secondary-btn:hover { color: #c9a96e; }
    .landing-prompts { max-width: 720px; margin: 0 auto 80px; padding: 0 48px; text-align: center; }
    .landing-prompts-label { font-size: 11px; color: #444; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 20px; }
    .landing-prompt-pills { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
    .landing-prompt-pills span { padding: 8px 16px; border: 1px solid #222; color: #666; font-size: 12px; cursor: pointer; transition: all 0.2s; text-align: left; }
    .landing-prompt-pills span:hover { border-color: #c9a96e; color: #c9a96e; }
    .landing-agents { max-width: 720px; margin: 0 auto 80px; padding: 0 48px; text-align: center; }
    .landing-agents-label { font-size: 11px; color: #444; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 24px; }
    .landing-agent-row { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
    .landing-agent-chip { padding: 6px 14px; border: 1px solid #333; font-size: 12px; letter-spacing: 0.05em; }
    .landing-agent-chip.seeder { color: #4caf50; border-color: #4caf50; }
    .landing-agent-chip.explorer { color: #ff9800; border-color: #ff9800; }
    .landing-agent-chip.critic { color: #f44336; border-color: #f44336; }
    .landing-agent-chip.verifier { color: #2196f3; border-color: #2196f3; }
    .landing-agent-chip.synthesizer { color: #9c27b0; border-color: #9c27b0; }
    .landing-agent-chip.memory { color: #888; border-color: #888; }
    .landing-arrow { color: #333; font-size: 16px; }
    .landing-footer { border-top: 1px solid #1a1a1a; padding: 24px 48px; display: flex; justify-content: space-between; font-size: 11px; color: #444; }
    .landing-footer a { color: #666; text-decoration: none; }
    .landing-footer a:hover { color: #c9a96e; }
    .auth-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: none; align-items: center; justify-content: center; z-index: 1000; }
    .auth-overlay.visible { display: flex; }
    .auth-modal { background: #0f0e0c; border: 1px solid #3d3529; border-radius: 4px; padding: 2rem; max-width: 360px; width: 90%; position: relative; }
    .auth-modal h2 { font-family: 'Cormorant Garamond', serif; font-size: 1.6rem; color: #c9a96e; margin: 0 0 0.5rem; }
    .auth-modal .auth-subtitle { font-size: 0.75rem; color: #9a958a; margin-bottom: 1.25rem; }
    .auth-field { margin-bottom: 1rem; }
    .auth-field label { display: block; font-size: 0.75rem; color: #9a958a; margin-bottom: 0.35rem; }
    .auth-field input { width: 100%; padding: 0.75rem; font-family: inherit; background: transparent; border: 1px solid #333; border-radius: 4px; color: #ccc; }
    .auth-submit { width: 100%; padding: 0.75rem 1.5rem; background: #c9a96e; border: none; border-radius: 4px; color: #0a0a0a; font-family: inherit; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
    .auth-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #888; cursor: pointer; font-size: 1.2rem; }
    .auth-error { color: #b04040; font-size: 0.85rem; margin-top: 0.75rem; }
    .auth-switch { margin-top: 1.25rem; font-size: 0.75rem; }
    .auth-switch span { color: #c9a96e; cursor: pointer; }
    .hiw-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); z-index: 2000; display: none; align-items: center; justify-content: center; padding: 24px; }
    .hiw-overlay.open { display: flex; }
    .hiw-modal { background: #0e0e0e; border: 1px solid #c9a96e; max-width: 640px; width: 100%; max-height: 85vh; overflow-y: auto; padding: 48px; position: relative; font-family: 'Courier New', monospace; }
    .hiw-close { position: absolute; top: 16px; right: 20px; background: none; border: none; color: #555; font-size: 18px; cursor: pointer; }
    .hiw-close:hover { color: #c9a96e; }
    .hiw-header { margin-bottom: 32px; }
    .hiw-header h2 { font-family: 'Cormorant Garamond', serif; font-size: 28px; color: #c9a96e; margin: 0 0 8px; font-weight: 400; }
    .hiw-sub { font-size: 13px; color: #666; line-height: 1.7; margin: 0; }
    .hiw-section { margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid #1a1a1a; }
    .hiw-section:last-of-type { border-bottom: none; }
    .hiw-section-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a96e; margin-bottom: 12px; }
    .hiw-section p { font-size: 13px; color: #888; line-height: 1.8; margin: 0; }
    .hiw-agents { display: flex; flex-direction: column; gap: 14px; }
    .hiw-agent { display: flex; gap: 16px; align-items: flex-start; }
    .hiw-agent-name { font-size: 12px; letter-spacing: 0.05em; min-width: 90px; padding-top: 1px; flex-shrink: 0; }
    .hiw-agent-desc { font-size: 12px; color: #666; line-height: 1.7; }
    .hiw-cta { display: inline-block; margin-top: 8px; padding: 12px 28px; background: #c9a96e; color: #0a0a0a; text-decoration: none; font-size: 13px; letter-spacing: 0.05em; transition: opacity 0.2s; }
    .hiw-cta:hover { opacity: 0.85; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #3a3528; border-radius: 0; }
    ::-webkit-scrollbar-thumb:hover { background: #c9a96e; }
    @media (max-width: 600px) {
      .landing-nav { flex-direction: column; align-items: flex-start; gap: 16px; padding: 20px 24px; }
      .landing-nav-links { gap: 16px; flex-wrap: wrap; }
      .landing-hero { margin: 60px auto 48px; padding: 0 24px; }
      .landing-hero h1 { font-size: 36px; }
      .landing-prompts { padding: 0 24px; }
      .landing-agents { padding: 0 24px; }
      .landing-footer { padding: 20px 24px; flex-direction: column; gap: 8px; }
    }
  </style>
</head>
<body class="landing">
  <nav class="landing-nav">
    <a href="/" class="landing-logo">Colony <span class="beta-badge">beta</span></a>
    <div class="landing-nav-links">
      <a href="/app">Launch</a>
      <button onclick="showAuthModal('login')">Sign In</button>
      <button onclick="showAuthModal('signup')" class="landing-cta-btn">Get Started</button>
    </div>
  </nav>

  <section class="landing-hero">
    <h1>Research that argues with itself.</h1>
    <p class="landing-sub">Colony maps your question into threads, explores each one deeply, then turns a dedicated Critic agent loose on the findings. You get a conclusion that's been stress-tested — not just summarized.</p>
    <div class="landing-actions">
      <a href="/app" class="landing-primary-btn">Try Colony</a>
      <button class="landing-secondary-btn" onclick="openHowItWorks()">See how it works →</button>
    </div>
  </section>

  <section class="landing-prompts">
    <p class="landing-prompts-label">People are researching</p>
    <div class="landing-prompt-pills">
      <span onclick="goToApp(this)">What supplement stack actually has evidence behind it for a cut?</span>
      <span onclick="goToApp(this)">What predicts real estate market downturns before they happen?</span>
      <span onclick="goToApp(this)">What does research say about building an audience from zero?</span>
      <span onclick="goToApp(this)">What are the most contested claims about AI replacing knowledge workers?</span>
      <span onclick="goToApp(this)">What does the evidence say about long distance relationships?</span>
    </div>
  </section>

  <section class="landing-agents" id="how-it-works">
    <p class="landing-agents-label">Six agents. One answer.</p>
    <div class="landing-agent-row">
      <div class="landing-agent-chip seeder">Seeder</div>
      <span class="landing-arrow">→</span>
      <div class="landing-agent-chip explorer">Explorer</div>
      <span class="landing-arrow">→</span>
      <div class="landing-agent-chip critic">Critic</div>
      <span class="landing-arrow">→</span>
      <div class="landing-agent-chip verifier">Verifier</div>
      <span class="landing-arrow">→</span>
      <div class="landing-agent-chip synthesizer">Synthesizer</div>
      <span class="landing-arrow">→</span>
      <div class="landing-agent-chip memory">Memory</div>
    </div>
  </section>

  <footer class="landing-footer">
    <span>Colony — recursive research engine</span>
    <span>Built by <a href="https://jpcspencer.com" target="_blank">Jordan Spencer</a></span>
  </footer>

  <div class="hiw-overlay" id="hiw-overlay" onclick="if(event.target.id==='hiw-overlay') closeHowItWorks()">
    <div class="hiw-modal">
      <button class="hiw-close" onclick="closeHowItWorks()">✕</button>
      <div class="hiw-header">
        <h2>How Colony Works</h2>
        <p class="hiw-sub">A recursive research system built on one idea: answers should be challenged, not just generated.</p>
      </div>
      <div class="hiw-section">
        <div class="hiw-section-label">The Problem</div>
        <p>Every AI tool you've used gives you an answer. Fast, confident, plausible. But nobody checked it. No one asked whether the sources actually support the claim, or whether a smarter counterargument exists. You got a summary, not a conclusion.</p>
      </div>
      <div class="hiw-section">
        <div class="hiw-section-label">The Loop</div>
        <div class="hiw-agents">
          <div class="hiw-agent">
            <span class="hiw-agent-name" style="color:#4caf50">Seeder</span>
            <span class="hiw-agent-desc">Maps your question into 3–5 distinct research threads. Not variations — genuinely different angles.</span>
          </div>
          <div class="hiw-agent">
            <span class="hiw-agent-name" style="color:#ff9800">Explorer</span>
            <span class="hiw-agent-desc">Researches each thread deeply using real web search and academic sources. Builds on everything Colony already knows.</span>
          </div>
          <div class="hiw-agent">
            <span class="hiw-agent-name" style="color:#f44336">Critic</span>
            <span class="hiw-agent-desc">Peer-reviews every finding. Scores confidence 0–100. Flags weak sources, logical gaps, and overclaimed conclusions. Sends the colony back in if needed.</span>
          </div>
          <div class="hiw-agent">
            <span class="hiw-agent-name" style="color:#2196f3">Verifier</span>
            <span class="hiw-agent-desc">Fetches every cited URL and checks whether the source actually supports the claim. Flags dead links and hallucinated attributions.</span>
          </div>
          <div class="hiw-agent">
            <span class="hiw-agent-name" style="color:#9c27b0">Synthesizer</span>
            <span class="hiw-agent-desc">Reads the entire colony memory and writes a final report with a plain-language TL;DR and full layered analysis. Flags what's known, probable, and uncertain.</span>
          </div>
          <div class="hiw-agent">
            <span class="hiw-agent-name" style="color:#888">Memory</span>
            <span class="hiw-agent-desc">Saves every finding to the Atlas — Colony's shared knowledge graph. Every run makes future runs smarter.</span>
          </div>
        </div>
      </div>
      <div class="hiw-section">
        <div class="hiw-section-label">The Result</div>
        <p>A synthesis with confidence scores, verified citations, and honest caveats. Not a chatbot answer — a conclusion that's been argued over. Saved to your private Codex, contributing to a shared Atlas that compounds over time.</p>
      </div>
      <a href="/app" class="hiw-cta">Try Colony →</a>
    </div>
  </div>

  <div class="auth-overlay" id="auth-overlay">
    <div class="auth-modal">
      <button class="auth-close" id="auth-close">✕</button>
      <h2 id="auth-title">Sign in</h2>
      <p class="auth-subtitle" id="auth-subtitle">Continue your research</p>
      <div class="auth-field">
        <label id="auth-email-label">Username or email</label>
        <input type="text" id="auth-email" placeholder="Username or email" autocomplete="username" />
      </div>
      <div class="auth-field" id="username-field" style="display:none">
        <label>Username</label>
        <input type="text" id="auth-username" placeholder="yourname" />
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

  <script>
    function goToApp(el) {
      const query = el.textContent.trim();
      sessionStorage.setItem('colony-prefill', query);
      window.location.href = '/app';
    }
    function showAuthModal(mode) {
      authMode = mode;
      document.getElementById('auth-overlay').classList.add('visible');
      const isLogin = mode === 'login';
      document.getElementById('auth-title').textContent = isLogin ? 'Sign in' : 'Create account';
      document.getElementById('auth-subtitle').textContent = isLogin ? 'Continue your research' : 'Begin your research';
      document.getElementById('auth-submit').textContent = isLogin ? 'Sign in' : 'Create account';
      document.getElementById('auth-switch-link').textContent = isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in';
      document.getElementById('auth-email-label').textContent = isLogin ? 'Username or email' : 'Email';
      document.getElementById('auth-email').placeholder = isLogin ? 'Username or email' : 'Email';
      document.getElementById('username-field').style.display = isLogin ? 'none' : 'block';
      document.getElementById('auth-error').textContent = '';
    }
    document.getElementById('auth-close').addEventListener('click', () => {
      document.getElementById('auth-overlay').classList.remove('visible');
    });
    document.getElementById('auth-overlay').addEventListener('click', e => {
      if (e.target.id === 'auth-overlay') document.getElementById('auth-overlay').classList.remove('visible');
    });
    let authMode = 'login';
    document.getElementById('auth-switch-link').addEventListener('click', () => {
      authMode = authMode === 'login' ? 'signup' : 'login';
      showAuthModal(authMode);
    });
    document.getElementById('auth-submit').addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value;
      const username = document.getElementById('auth-username').value.trim();
      const errorEl = document.getElementById('auth-error');
      errorEl.textContent = '';
      if (!email || !password) {
        errorEl.textContent = authMode === 'login' ? 'Please enter username or email and password' : 'Please enter email and password';
        return;
      }
      try {
        const endpoint = authMode === 'login' ? '/api/login' : '/api/signup';
        const body = authMode === 'login' ? { identifier: email, password } : { email, password, username };
        const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) { errorEl.textContent = data.error || 'Something went wrong'; return; }
        localStorage.setItem('colony-token', data.token);
        localStorage.setItem('colony-email', data.email);
        if (data.username) localStorage.setItem('colony-username', data.username);
        else localStorage.removeItem('colony-username');
        window.location.href = '/app';
      } catch (err) { errorEl.textContent = 'Connection error'; }
    });
    document.getElementById('auth-password').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('auth-submit').click();
    });
    function openHowItWorks() {
      document.getElementById('hiw-overlay').classList.add('open');
    }
    function closeHowItWorks() {
      document.getElementById('hiw-overlay').classList.remove('open');
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeHowItWorks();
    });
    function checkLandingAuth() {
      const token = localStorage.getItem('colony-token');
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = localStorage.getItem('colony-username') || payload.username || payload.userId;
        const signInBtn = document.querySelector('.landing-nav-links button:first-of-type');
        if (signInBtn) signInBtn.style.display = 'none';
        const ctaBtn = document.querySelector('.landing-cta-btn');
        if (ctaBtn) {
          ctaBtn.textContent = username || 'You';
          ctaBtn.onclick = () => window.location.href = '/app';
        }
      } catch(e) {}
    }
    checkLandingAuth();
  </script>
  <script>
    (function() {
      const para = document.querySelector('.landing-sub');
      if (!para) return;
      const text = para.textContent;
      para.innerHTML = text.split('').map((char) =>
        char === ' ' ? ' ' : '<span class="glow-char">' + char + '</span>'
      ).join('');
      function glowRandom() {
        const chars = document.querySelectorAll('.glow-char');
        if (!chars.length) return;
        const count = Math.floor(Math.random() * 3) + 2;
        const indices = [];
        while (indices.length < count) {
          const idx = Math.floor(Math.random() * chars.length);
          if (!indices.includes(idx)) indices.push(idx);
        }
        indices.forEach(idx => {
          chars[idx].classList.add('glowing');
          setTimeout(() => chars[idx].classList.remove('glowing'), 800 + Math.random() * 400);
        });
        setTimeout(glowRandom, 150 + Math.random() * 200);
      }
      glowRandom();
    })();
  </script>
</body>
</html>`;

app.get('/', (req, res) => {
  res.type('html').send(LANDING_HTML);
});

app.get('/app', (req, res) => {
  res.type('html').send(HTML);
});

app.get('/verify-email', (req, res) => {
  res.type('html').send(VERIFY_EMAIL_HTML);
});

app.get('/synthesis/:id', async (req, res) => {
  try {
    const synth = await Synthesis.findById(req.params.id);
    if (!synth) {
      return res.type('html').send(synthesisPageHTML({ title: 'Synthesis not found', message: 'Synthesis not found' }));
    }
    if (!synth.isPublic) {
      let isOwner = false;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'colony-secret-key');
          isOwner = synth.userId && synth.userId.toString() === decoded.userId;
        } catch (e) {}
      }
      if (!isOwner) {
        return res.type('html').send(synthesisPageHTML({ title: 'Private', message: 'This synthesis is private' }));
      }
    }
    const topic = synth.topic || synth.goal || 'Synthesis';
    const date = synth.createdAt ? new Date(synth.createdAt).toISOString().slice(0, 10) : '';
    const iterations = synth.findingCount ?? synth.iterations ?? 0;
    const content = marked.parse(synth.content || '');
    res.type('html').send(synthesisPageHTML({ title: topic, content, date, iterations }));
  } catch (e) {
    res.status(500).type('html').send(synthesisPageHTML({ title: 'Error', message: 'Something went wrong' }));
  }
});

app.post('/run', async (req, res) => {
  const goal = req.body?.goal;
  if (!goal) {
    return res.status(400).json({ error: 'Missing goal' });
  }

  let userId = null;
  let defaultPublic = false;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'colony-secret-key');
      userId = decoded.userId;
      const user = await User.findById(userId).select('defaultPublic');
      if (user) defaultPublic = !!user.defaultPublic;
    } catch (e) {}
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
    await runColony(goal, emit, userId, defaultPublic);
  } catch (err) {
    const status = err.status ?? err.statusCode ?? err.code;
    const is429 = status === 429 || status === '429' || (err.message && (String(err.message).includes('429') || String(err.message).toLowerCase().includes('rate limit')));
    if (is429) {
      emit('\n> ⚠️ Colony hit the API rate limit mid-run. This is a beta limitation. Please wait a minute and try again.');
    } else {
      const msg = err.message && typeof err.message === 'string' && !err.message.trim().startsWith('{')
        ? err.message
        : 'An unexpected API error occurred. Please try again.';
      emit(`\n> ⚠️ Error: ${msg}`);
    }
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

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'colony-secret-key');
    req.user = { userId: decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

app.get('/api/codex/public', async (req, res) => {
  try {
    const syntheses = await Synthesis.find({ isPublic: true })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(syntheses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/codex/mine', requireAuth, async (req, res) => {
  try {
    const syntheses = await Synthesis.find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(syntheses);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const User = require('./src/models/user');
const { signToken, authMiddleware } = require('./src/auth');

async function sendVerificationEmail(email, token) {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const from = process.env.EMAIL_FROM;
  if (!host || !port || !user || !pass || !from) {
    console.log('· email verification skipped — SMTP not configured');
    return;
  }
  const transporter = nodemailer.createTransport({ host, port: parseInt(port, 10), secure: port === '465', auth: { user, pass } });
  await transporter.sendMail({
    from,
    to: email,
    subject: 'Verify your Colony account',
    text: `Click to verify your Colony account: https://usecolony.app/verify-email?token=${token}`
  });
}

app.post('/api/signup', async (req, res) => {
  const { email, password, username } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = await User.create({ email, password, username: username || undefined });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    sendVerificationEmail(user.email, verificationToken).catch(err => console.error('Verification email failed:', err));
    const token = signToken(user._id);
    res.json({ token, email: user.email, username: user.username, emailVerified: false });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const identifier = req.body.email || req.body.identifier;
    const { password } = req.body;
    if (!identifier || !password) return res.status(401).json({ error: 'Invalid email or password' });
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() }
      ]
    });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(user._id);
    res.json({ token, email: user.email, username: user.username, emailVerified: !!user.emailVerified });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('username email defaultPublic emailVerified');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ username: user.username, email: user.email, defaultPublic: user.defaultPublic || false, emailVerified: !!user.emailVerified });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/verify-email', async (req, res) => {
  const { token } = req.query;
  try {
    if (!token) return res.status(400).json({ error: 'Invalid or expired token' });
    const user = await User.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();
    res.json({ ok: true, message: 'Email verified' });
  } catch (e) {
    res.status(500).json({ error: 'Invalid or expired token' });
  }
});

app.post('/api/resend-verification', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Already verified' });
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user.email, verificationToken);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/settings/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings/visibility', requireAuth, async (req, res) => {
  try {
    const { defaultPublic } = req.body;
    await User.findByIdAndUpdate(req.user.userId, { defaultPublic: !!defaultPublic });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/synthesis/:id', requireAuth, async (req, res) => {
  try {
    const synth = await Synthesis.findById(req.params.id);
    if (!synth) return res.status(404).json({ error: 'Not found' });
    if (!synth.userId || synth.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    await Synthesis.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/settings/delete', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    await Synthesis.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Colony server at http://localhost:${PORT}`);
});
