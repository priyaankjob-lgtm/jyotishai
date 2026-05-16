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
    const body = JSON.parse(event.body || '{}');
    const { dob, tob, lat, lon } = body;

    const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
    const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

    // Step 1: OAuth Token
    const tokenRes = await fetch('https://api.prokerala.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Token failed' }) };

    const datetime = `${dob}T${tob}:00+05:30`;
    const coordinates = `${lat},${lon}`;
    const base = 'https://api.prokerala.com/v2/astrology';
    const auth = { Authorization: `Bearer ${token}` };
    const params = `ayanamsa=1&coordinates=${coordinates}&datetime=${encodeURIComponent(datetime)}`;

    // Step 2: All 6 API calls in parallel
    const [pR, bR, dR, yR, mR, kR] = await Promise.all([
      fetch(`${base}/planet-position?${params}`, { headers: auth }),
      fetch(`${base}/birth-details?${params}`, { headers: auth }),
      fetch(`${base}/dasha-periods?${params}`, { headers: auth }),
      fetch(`${base}/yoga-details?${params}`, { headers: auth }),
      fetch(`${base}/mangal-dosha?${params}`, { headers: auth }),
      fetch(`${base}/kaal-sarp-dosha?${params}`, { headers: auth }),
    ]);

    const [planets, birth, dasha, yoga, mangal, kaalsarp] = await Promise.all([
      pR.json(), bR.json(), dR.json(), yR.json(), mR.json(), kR.json()
    ]);

    console.log('BIRTH DATA:', JSON.stringify(birth?.data).substring(0, 400));
    console.log('DASHA DATA:', JSON.stringify(dasha?.data).substring(0, 400));
    console.log('YOGA DATA:', JSON.stringify(yoga?.data).substring(0, 400));
    console.log('MANGAL DATA:', JSON.stringify(mangal?.data).substring(0, 200));
    console.log('KAALSARP DATA:', JSON.stringify(kaalsarp?.data).substring(0, 200));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ planets, birth, dasha, yoga, mangal, kaalsarp })
    };

  } catch (err) {
    console.error('Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
