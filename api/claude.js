export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { messages, systemPrompt } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    console.log('Claude response:', JSON.stringify(data).substring(0, 200));

    if (data.error) {
      return res.status(500).json({ error: data.error.message, reply: 'API Error: ' + data.error.message });
    }

    return res.status(200).json({ reply: data.content?.[0]?.text || 'Kshama karein, abhi response nahi mil raha.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
