// loop.js — Colony's recursive research engine

const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const client = new Anthropic();

// Core recursive loop state
let colonyMemory = [];
let iterationCount = 0;
const MAX_ITERATIONS = 10;

async function runColony(goal) {
  console.log('\n🌿 COLONY INITIALIZED');
  console.log(`📍 Goal: ${goal}\n`);
  console.log('─'.repeat(60));

  const threads = await seed(goal);
  
  for (const thread of threads) {
    await recursiveLoop(thread, goal);
  }

  await synthesize(goal);
}

async function recursiveLoop(thread, goal) {
  iterationCount++;
  
  if (iterationCount > MAX_ITERATIONS) {
    console.log('⚠️  Max iterations reached — terminating loop');
    return;
  }

  console.log(`\n🔍 [EXPLORER] Researching thread: "${thread}"`);
  const finding = await explore(thread, goal);
  console.log(`\n📄 Finding:\n${finding}`);
  
  console.log(`\n⚖️  [CRITIC] Evaluating...`);
  const verdict = await critique(thread, finding, goal);
  console.log(`\n📊 Verdict:\n${verdict}`);
  
  colonyMemory.push({ thread, finding, verdict, iteration: iterationCount });

  const needsDeeperDig = verdict.toLowerCase().includes('insufficient') || 
                         verdict.toLowerCase().includes('investigate further') ||
                         verdict.toLowerCase().includes('contradicts');

  if (needsDeeperDig) {
    console.log(`\n🔄 [LOOP] Critic flagged gaps — going deeper on: "${thread}"`);
    const deeperThread = `Deeper investigation: ${thread} — focus on gaps identified by critic`;
    await recursiveLoop(deeperThread, goal);
  } else {
    console.log(`\n✅ [LOOP] Thread resolved: "${thread}"`);
  }
}

async function seed(goal) {
  const { seeder } = require('./agents/seeder');
  return await seeder(goal, client);
}

async function explore(thread, goal) {
  const { explorer } = require('./agents/explorer');
  return await explorer(thread, goal, colonyMemory, client);
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

  console.log('🏁 FINAL SYNTHESIS:');
  console.log('─'.repeat(60));
  console.log(response.content[0].text);
  console.log('─'.repeat(60));
  console.log(`\n📊 Total iterations: ${iterationCount}`);
  console.log(`🧠 Threads in memory: ${colonyMemory.length}`);
}

module.exports = { runColony };