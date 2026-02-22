// agents/seeder.js — breaks the goal into research threads

function parseThreads(raw, goal) {
  const trimmed = raw.trim();
  if (!trimmed) return [goal];

  // Strategy 1: Split by numbered list (1. 2. 3. or 1) 2) 3))
  const numberedParts = trimmed.split(/\n\s*\d+[\.\)]\s*/).map(s => s.trim()).filter(Boolean);
  const fromNumbered = numberedParts
    .map(t => t.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter(t => t.length >= 5);
  if (fromNumbered.length >= 2) {
    return fromNumbered;
  }

  // Strategy 2: Split by newlines, filter empty lines
  const lineParts = trimmed.split(/\n/).map(s => s.trim()).filter(Boolean);
  if (lineParts.length >= 2) {
    return lineParts;
  }

  // Strategy 3: Single thread fallback
  return [trimmed || goal];
}

async function seeder(goal, client) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: `You are the Colony Seeder Agent. Your job is to map a research goal into 3-5 focused exploration threads.

Research goal: "${goal}"

Return ONLY a numbered list with one thread per line. No preamble, no explanation, no other text. Just the list.

Example:
1. First specific research thread
2. Second specific research thread
3. Third specific research thread

Make each thread specific, distinct, and directly relevant to the goal. These will be handed to Explorer agents for deep investigation.`
    }]
  });

  const raw = response.content[0].text.trim();
  const threads = parseThreads(raw, goal);

  console.log(`\n🌱 [SEEDER] Mapped ${threads.length} research threads:`);
  threads.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));
  return threads;
}
  
  module.exports = { seeder };