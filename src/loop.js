// loop.js — Colony's recursive research engine

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const client = new Anthropic();
const { saveFinding } = require('./memory');
const { verifyCitations } = require('./agents/verifier');

// Core recursive loop state
let colonyMemory = [];
let iterationCount = 0;
const MAX_ITERATIONS = 10;

function generateRunId() {
  return new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
}

async function runColony(goal, emit = null) {
  colonyMemory = [];
  iterationCount = 0;

  const originalLog = console.log;
  if (emit) {
    console.log = (...args) => emit(args.map((a) => (typeof a === 'string' ? a : String(a))).join(''));
  }

  try {
    console.log('\n🌿 COLONY INITIALIZED');
    console.log(`📍 Goal: ${goal}\n`);
    console.log('─'.repeat(60));

    const runId = generateRunId();
    const threads = await seed(goal);

    await Promise.all(
      threads.map((thread, index) =>
        new Promise(resolve => setTimeout(resolve, index * 5000))
          .then(() => recursiveLoop(thread, goal, 0, runId))
      )
    );

    await synthesize(goal);
  } finally {
    if (emit) {
      console.log = originalLog;
    }
  }
}

async function recursiveLoop(thread, goal, depth = 0, runId = null) {
  iterationCount++;
  
  if (iterationCount > MAX_ITERATIONS) {
    console.log('⚠️  Max iterations reached — terminating loop');
    return;
  }

  const { queryMemory } = require('./memory');
  const priorFindings = queryMemory(thread);
  if (priorFindings.length > 0) {
    console.log(`📚 [MEMORY] Injecting ${priorFindings.length} prior finding(s) for thread: "${thread}"`);
  }
  console.log(`\n🔍 [EXPLORER] Researching thread: "${thread}" (depth ${depth})`);
  const result = await explore(thread, goal, priorFindings);
  const finding = result.text;
  const citations = result.citations || [];
  console.log(`📎 [MEMORY] Citations received in loop: ${citations.length}`);
  console.log(`\n📄 Finding:\n${finding}`);
  if (citations.length > 0) {
    console.log(`📎 [MEMORY] ${citations.length} citation(s) preserved for this thread`);
  }
  
  console.log(`\n⚖️  [CRITIC] Evaluating...`);
  const verdict = await critique(thread, finding, goal);
  console.log(`\n📊 Verdict:\n${verdict}`);
  
  colonyMemory.push({ thread, finding, verdict, iteration: iterationCount });

  const verifiedCitations = await verifyCitations(citations, finding);
  const verifiedCount = verifiedCitations.filter(c => c.verified).length;
  const deadLinks = verifiedCitations.filter(c => c.verificationStatus === 'DEAD_LINK').length;
  console.log(`✓ [VERIFIER] ${verifiedCount}/${verifiedCitations.length} citations verified${deadLinks > 0 ? `, ${deadLinks} dead link(s) flagged` : ''}`);

  if (runId) {
    saveFinding({ thread, finding, verdict, citations: verifiedCitations, runId });
  }

  const needsDeeperDig = verdict.toLowerCase().includes('insufficient') || 
                         verdict.toLowerCase().includes('investigate further') ||
                         verdict.toLowerCase().includes('contradicts');

  if (needsDeeperDig && depth < 2) {
    console.log(`\n🔄 [LOOP] Critic flagged gaps — going deeper on: "${thread}" (depth ${depth} → ${depth + 1})`);
    await recursiveLoop(thread, goal, depth + 1, runId);
  } else if (needsDeeperDig) {
    console.log(`\n⚠️  [LOOP] Depth limit (2) reached for thread: "${thread}" — stopping recursion`);
  } else {
    console.log(`\n✅ [LOOP] Thread resolved: "${thread}"`);
  }
}

async function seed(goal) {
  const { seeder } = require('./agents/seeder');
  return await seeder(goal, client);
}

async function explore(thread, goal, priorFindings = []) {
  const { explorer } = require('./agents/explorer');
  return await explorer(thread, goal, colonyMemory, client, priorFindings);
}

async function critique(thread, finding, goal) {
  const { critic } = require('./agents/critic');
  return await critic(thread, finding, goal, colonyMemory, client);
}

async function synthesize(goal) {
  console.log('\n' + '─'.repeat(60));
  console.log('🧬 [SYNTHESIZER] Consolidating colony findings...\n');
  
  const memoryDump = colonyMemory.map((m, i) => 
    `Thread ${i+1}: ${m.thread}\nFinding: ${m.finding}\nVerdict: ${m.verdict}`
  ).join('\n\n---\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are the Colony Synthesizer. The colony has completed its research on this goal: "${goal}"
      
Here are all findings and critic verdicts from the research loop:

${memoryDump}

Produce a final synthesis that:
1. States the most important discoveries
2. Highlights any unresolved contradictions
3. Gives a confidence score (0-100) on goal completion
4. States clearly: has the goal been accomplished?`
    }]
  });

  const synthesisText = response.content[0].text;
  console.log('🏁 FINAL SYNTHESIS:');
  console.log('─'.repeat(60));
  console.log(synthesisText);
  console.log('─'.repeat(60));
  console.log(`\n📊 Total iterations: ${iterationCount}`);
  console.log(`🧠 Threads in memory: ${colonyMemory.length}`);

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '-');
  const outputDir = path.join(process.cwd(), 'outputs');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `colony-run-${timestamp}.md`);
  const outputContent = `# Colony Run

**Goal:** ${goal}

**Total iterations:** ${iterationCount}

**Threads in memory:** ${colonyMemory.length}

---

## Final Synthesis

${synthesisText}
`;
  fs.writeFileSync(outputPath, outputContent, 'utf8');
  console.log(`\n📁 Synthesis saved to ${outputPath}`);
}

module.exports = { runColony };