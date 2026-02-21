// server.js — Colony web interface

const express = require('express');
const { runColony } = require('./src/loop');

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
    .line[data-agent="loop"] { color: var(--text-muted); }
    .line[data-agent="web"] { color: var(--text-muted); }
  </style>
</head>
<body>
  <div class="container">
    <h1>Colony</h1>
    <p class="subtitle">Recursive research engine — map a goal into threads, explore, critique, synthesize</p>
    <div class="input-row">
      <input type="text" id="goal" placeholder="Enter your research goal..." />
      <button id="launch">Launch Colony</button>
    </div>
    <div class="output-panel" id="output"></div>
  </div>

  <script>
    const goalInput = document.getElementById('goal');
    const launchBtn = document.getElementById('launch');
    const output = document.getElementById('output');

    function agentForLine(text) {
      if (/\\[SEEDER\\]|🌱/.test(text)) return 'seeder';
      if (/\\[EXPLORER\\]|🔍|\\[WEB SEARCH\\]/.test(text)) return 'explorer';
      if (/\\[CRITIC\\]|⚖️|📊/.test(text)) return 'critic';
      if (/\\[SYNTHESIZER\\]|🧬|🏁|FINAL SYNTHESIS/.test(text)) return 'synthesizer';
      if (/\\[MEMORY\\]|📁/.test(text)) return 'memory';
      if (/\\[LOOP\\]|🔄|✅|⚠️/.test(text)) return 'loop';
      return 'web';
    }

    function appendLine(text) {
      const div = document.createElement('div');
      div.className = 'line';
      div.dataset.agent = agentForLine(text);
      div.textContent = text;
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
    }

    launchBtn.addEventListener('click', async () => {
      const goal = goalInput.value.trim();
      if (!goal) return;
      launchBtn.disabled = true;
      output.innerHTML = '';

      try {
        const res = await fetch('/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal })
        });
        if (!res.ok) throw new Error(res.statusText);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) appendLine(data.text);
              } catch (_) {}
            }
          }
        }
        if (buffer.startsWith('data: ')) {
          try {
            const data = JSON.parse(buffer.slice(6));
            if (data.text) appendLine(data.text);
          } catch (_) {}
        }
      } catch (err) {
        appendLine('Error: ' + err.message);
      } finally {
        launchBtn.disabled = false;
      }
    });
  </script>
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Colony server at http://localhost:${PORT}`);
});
