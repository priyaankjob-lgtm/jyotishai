export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages, systemPrompt, tier = 'free' } = req.body;

    // Model selection based on tier
    const models = {
      free:          { model: 'claude-haiku-4-5-20251001',   maxTokens: 800,  label: 'Haiku' },
      premium:       { model: 'claude-sonnet-4-5-20251022',  maxTokens: 1500, label: 'Sonnet 4.5' },
      super_premium: { model: 'claude-sonnet-4-5-20251022',  maxTokens: 2000, label: 'Sonnet 4.5 + Opus Check' }
    };

    const config = models[tier] || models.free;
    console.log(`Tier: ${tier} | Model: ${config.model} | MaxTokens: ${config.maxTokens}`);

    // Primary — Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages
      })
    });

    const claudeData = await claudeRes.json();
    console.log('Claude response status:', claudeRes.status);

    if (claudeData.error) {
      return res.status(500).json({ error: claudeData.error.message, reply: 'API Error: ' + claudeData.error.message });
    }

    const claudeReply = claudeData.content?.[0]?.text || '';

    // Super Premium — Opus verification
    if (tier === 'super_premium') {
      try {
        const verifyRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 600,
            messages: [{
              role: 'user',
              content: `You are a senior Vedic astrology expert. Review this prediction briefly:

"${claudeReply}"

Check: 1) Is gemstone correct? 2) Is timing reasonable? 3) Any major error?

If correct, say "✅ Verified" + one additional insight.
If error found, say "⚠️ Note:" + correction.
Be very brief — 2-3 sentences max. Same language as prediction.`
            }]
          })
        });

        const verifyData = await verifyRes.json();
        const verification = verifyData.content?.[0]?.text || '';

        return res.status(200).json({
          reply: claudeReply,
          verification,
          model: config.label,
          tier,
          verified: true
        });

      } catch (err) {
        console.error('Opus verification failed:', err.message);
        return res.status(200).json({ reply: claudeReply, model: config.label, tier, verified: false });
      }
    }

    return res.status(200).json({ reply: claudeReply, model: config.label, tier });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
