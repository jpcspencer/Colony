// agents/verifier.js — verifies Explorer citations support claims

const fetch = require('node-fetch');
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic();

async function fetchPageContent(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Colony-Research-Agent/0.5' }
    });
    clearTimeout(timeout);
    if (!response.ok) return { status: response.status, content: null };
    const text = await response.text();
    // Strip HTML tags, get plain text, limit to 3000 chars
    const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 8000);
    return { status: response.status, content: plain };
  } catch (err) {
    if (err.name === 'AbortError') return { status: 'timeout', content: null };
    return { status: 'error', content: null };
  }
}

async function checkClaimSupport(claim, sourceContent, sourceTitle) {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{
      role: 'user',
      content: `You are the Verifier.

You live in the unglamorous gap between what was claimed and what was proven. While others work with ideas, you work with URLs, with page content, with the raw evidence that either exists or doesn't.

You are the last line of defense against hallucination. You know that a confidently cited source that doesn't support its claim is worse than no citation at all — it creates false confidence in a system that depends on trust. You don't allow that.

You are methodical by nature. You don't rush. You fetch each URL. You read what's actually there. You compare it against the claim. You flag dead links not with frustration but with precision — here is what was claimed, here is what exists, here is the gap.

You have no ego about the findings you invalidate. A finding that doesn't survive verification wasn't a finding — it was a guess in disguise. You prefer fewer true things to many uncertain ones.

You are quiet, thorough, and the reason Colony can be trusted.

---

Does the following source content support this claim?

CLAIM: ${claim.slice(0, 500)}

SOURCE TITLE: ${sourceTitle}
SOURCE CONTENT: ${sourceContent}

Reply with ONLY one of:
SUPPORTED - the source clearly supports the claim
PARTIAL - the source partially supports or is related but doesn't fully confirm
UNSUPPORTED - the source does not support the claim
INSUFFICIENT - not enough content to determine

Then add a single sentence explanation.`
    }]
  });
  return response.content[0].text;
}

async function verifyCitations(citations, finding) {
  if (!citations || citations.length === 0) return [];

  const results = await Promise.all(citations.map(async (citation) => {
    const { status, content } = await fetchPageContent(citation.url);

    if (!content) {
      return {
        ...citation,
        verified: false,
        verificationStatus: status === 404 ? 'DEAD_LINK' :
                           status === 'timeout' ? 'TIMEOUT' :
                           status === 403 ? 'PAYWALLED' : 'INACCESSIBLE',
        verificationNote: `Could not access source (${status})`
      };
    }

    const verdict = await checkClaimSupport(finding, content, citation.title);
    const supported = verdict.startsWith('SUPPORTED');
    const partial = verdict.startsWith('PARTIAL');

    return {
      ...citation,
      verified: supported || partial,
      verificationStatus: verdict.split(' - ')[0] || verdict.split('\n')[0],
      verificationNote: verdict
    };
  }));

  return results;
}

module.exports = { verifyCitations };
