// agents/seeder.js — breaks the goal into research threads

async function seeder(goal, client) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `You are the Colony Seeder Agent. Your job is to map a research goal into 3-5 focused exploration threads.
  
  Research goal: "${goal}"
  
  Return ONLY a JSON array of thread strings, nothing else. Example format:
  ["thread one", "thread two", "thread three"]
  
  Make each thread specific, distinct, and directly relevant to the goal. These will be handed to Explorer agents for deep investigation.`
      }]
    });
  
    const raw = response.content[0].text.trim();
    
    try {
      const threads = JSON.parse(raw);
      console.log(`\n🌱 [SEEDER] Mapped ${threads.length} research threads:`);
      threads.forEach((t, i) => console.log(`   ${i+1}. ${t}`));
      return threads;
    } catch (e) {
      console.log('⚠️  Seeder parse error, using raw response as single thread');
      return [goal];
    }
  }
  
  module.exports = { seeder };