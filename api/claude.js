export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { messages, systemPrompt, tier = 'free' } = req.body;

    // Model selection
    const models = {
      free:          { model: 'claude-haiku-4-5-20251001',  maxTokens: 800,  label: '⚡ Haiku' },
      premium:       { model: 'claude-sonnet-4-6',          maxTokens: 1500, label: '💜 Sonnet 4.6' },
      super_premium: { model: 'claude-sonnet-4-6',          maxTokens: 2000, label: '👑 Sonnet 4.6' }
    };

    const config = models[tier] || models.free;
    console.log(`Tier: ${tier} | Model: ${config.model}`);

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
    console.log('Claude status:', claudeRes.status, '| Error:', claudeData.error?.message || 'none');

    if (claudeData.error) {
      return res.status(500).json({ error: claudeData.error.message, reply: '⚠️ ' + claudeData.error.message });
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
            model: 'claude-opus-4-6',
            max_tokens: 400,
            messages: [{
              role: 'user',
              content: `Senior Vedic astrologer — review this prediction in 2 sentences max:
"${claudeReply.substring(0, 500)}"
Say "✅ Verified" if correct, or "⚠️ Note:" + correction. Same language.`
            }]
          })
        });
        const verifyData = await verifyRes.json();
        const verification = verifyData.content?.[0]?.text || '';
        return res.status(200).json({ reply: claudeReply, verification, model: config.label, tier });
      } catch (err) {
        console.error('Opus failed:', err.message);
      }
    }

    return res.status(200).json({ reply: claudeReply, model: config.label, tier });

  } catch (err) {
    console.error('Fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
