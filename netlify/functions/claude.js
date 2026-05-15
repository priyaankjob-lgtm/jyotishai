exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { messages, systemPrompt } = JSON.parse(event.body || '{}');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    console.log('Anthropic response:', JSON.stringify(data).substring(0, 200));

    if (data.error) {
      console.error('Anthropic error:', data.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: data.error.message, reply: 'API Error: ' + data.error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: data.content?.[0]?.text || 'Kshama karein, abhi response nahi mil raha.' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
