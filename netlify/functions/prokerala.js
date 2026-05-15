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
    const { dob, tob, lat, lon, tz } = body;

    const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
    const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

    // Step 1: Get OAuth token
    const tokenRes = await fetch('https://api.prokerala.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    if (!token) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Token fetch failed', details: tokenData })
      };
    }

    // Step 2: Get planet positions
    const datetime = `${dob}T${tob}:00+05:30`;
    const coordinates = `${lat},${lon}`;

    const planetRes = await fetch(
      `https://api.prokerala.com/v2/astrology/planet-position?ayanamsa=1&coordinates=${coordinates}&datetime=${encodeURIComponent(datetime)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const planetData = await planetRes.json();

    // Step 3: Get kundli (birth chart basics)
    const kundliRes = await fetch(
      `https://api.prokerala.com/v2/astrology/kundli?ayanamsa=1&coordinates=${coordinates}&datetime=${encodeURIComponent(datetime)}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    const kundliData = await kundliRes.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        planets: planetData,
        kundli: kundliData
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
