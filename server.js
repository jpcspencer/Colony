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
  return 'web';
}

function appendLine(text) {
  const div = document.createElement('div');
  div.className = 'line';
  div.dataset.agent = agentForLine(text);
  div.textContent = text;
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
  tryParseNode(text);
}

// ── Node parsing from stream ──────────────────────────────────
const graphNodes = [];
function tryParseNode(text) {
  // Parse Explorer findings added to memory
  if (text.includes('[MEMORY]') && text.includes('citation')) {
    const threadMatch = text.match(/for thread: "([^"]+)"/);
    if (threadMatch) {
      const agent = agentForLine(text);
      addGraphNode({
        thread: threadMatch[1],
        agent: 'explorer',
        finding: text,
        confidence: 70 + Math.floor(Math.random() * 20),
        runId: new Date().toISOString().slice(0,16)
      });
    }
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
  const i = nodeMeshes.length;
  const phi2 = Math.PI*(3-Math.sqrt(5));
  const y = 1-(i/Math.max(graphNodes.length-1,1))*2;
  const r2 = Math.sqrt(Math.max(0,1-y*y));
  const spread = 8 + Math.random()*3;
  const pos = new THREE.Vector3(
    Math.cos(phi2*i)*r2*spread,
    y*spread*0.7,
    Math.sin(phi2*i)*r2*spread
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

// ── Launch ────────────────────────────────────────────────────
launchBtn.addEventListener('click', async () => {
  const goal = goalInput.value.trim();
  if (!goal) return;
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
