export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { dob, tob, lat, lon } = req.body;

    const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
    const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

    // Get Token
    const tokenRes = await fetch('https://api.prokerala.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}`
    });
    const { access_token: token } = await tokenRes.json();
    if (!token) return res.status(500).json({ error: 'Token failed' });

    const datetime = `${dob}T${tob}:00+05:30`;
    const coordinates = `${lat},${lon}`;
    const params = `ayanamsa=1&coordinates=${coordinates}&datetime=${encodeURIComponent(datetime)}`;
    const base = 'https://api.prokerala.com/v2/astrology';
    const auth = { Authorization: `Bearer ${token}` };

    // Only planet position — simple & working
    const planetRes = await fetch(`${base}/planet-position?${params}`, { headers: auth });
    const planets = await planetRes.json();

    const kundliRes = await fetch(`${base}/kundli?${params}`, { headers: auth });
    const kundli = await kundliRes.json();

    console.log('PLANETS:', JSON.stringify(planets?.data?.planet_position?.[0]).substring(0, 200));

    return res.status(200).json({ planets, kundli });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
