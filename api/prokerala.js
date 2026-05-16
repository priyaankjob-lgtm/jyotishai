export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { dob, tob, lat, lon } = req.body;

    const CLIENT_ID = process.env.PROKERALA_CLIENT_ID;
    const CLIENT_SECRET = process.env.PROKERALA_CLIENT_SECRET;

    // Step 1: Get Token
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

    // Also get kundli for ascendant
    const kundliRes = await fetch(`${base}/kundli?${params}`, { headers: auth });
    const kundli = await kundliRes.json();

    console.log('BIRTH:', JSON.stringify(birth?.data).substring(0, 300));
    console.log('DASHA:', JSON.stringify(dasha?.data).substring(0, 300));
    console.log('YOGA:', JSON.stringify(yoga?.data).substring(0, 300));
    console.log('MANGAL:', JSON.stringify(mangal?.data).substring(0, 200));
    console.log('KAALSARP:', JSON.stringify(kaalsarp?.data).substring(0, 200));

    return res.status(200).json({ planets, kundli, birth, dasha, yoga, mangal, kaalsarp });

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
