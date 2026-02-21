// agents/explorer.js — investigates a research thread

async function explorer(thread, goal, memory, client) {
    const priorFindings = memory.length > 0 
      ? `\n\nPrior colony findings for context:\n${memory.map(m => `- ${m.thread}: ${m.finding.slice(0, 200)}...`).join('\n')}`
      : '';
  
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a Colony Explorer Agent — a rigorous researcher investigating a specific thread.
  
  Overall research goal: "${goal}"
  Your assigned thread: "${thread}"${priorFindings}
  
  Investigate this thread thoroughly. Produce a detailed finding that includes:
  1. Key facts and insights discovered
  2. Any surprising or non-obvious connections
  3. Open questions or gaps in knowledge
  4. Confidence level in your findings (low/medium/high)
  
  Be specific and substantive. This will be reviewed by a Critic Agent.`
      }]
    });
  
    return response.content[0].text;
  }
  
  module.exports = { explorer };