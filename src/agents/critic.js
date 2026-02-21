// agents/critic.js — peer reviews explorer output

async function critic(thread, finding, goal, memory, client) {
    const priorVerdicts = memory.length > 0
      ? `\n\nPrior critic verdicts in this colony run:\n${memory.map(m => `- ${m.thread}: ${m.verdict.slice(0, 150)}...`).join('\n')}`
      : '';
  
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are a Colony Critic Agent — a rigorous peer reviewer evaluating an Explorer's research finding.
  
  Overall research goal: "${goal}"
  Thread being evaluated: "${thread}"
  
  Explorer's finding:
  ${finding}
  ${priorVerdicts}
  
  Evaluate this finding critically:
  1. Is the evidence sufficient or insufficient?
  2. Are there logical gaps or unsupported claims?
  3. Does it contradict any prior findings?
  4. What is your confidence score (0-100)?
  5. Verdict: ACCEPTED, NEEDS REVISION, or INVESTIGATE FURTHER
  
  Be demanding. Use the words "insufficient", "investigate further", or "contradicts" explicitly if warranted — these trigger deeper research loops.`
      }]
    });
  
    return response.content[0].text;
  }
  
  module.exports = { critic };