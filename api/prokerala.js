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
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(500).json({ error: 'Token failed', details: tokenData });

    const datetime = `${dob}T${tob}:00+05:30`;
    const coordinates = `${lat},${lon}`;
    const params = `ayanamsa=1&coordinates=${coordinates}&datetime=${encodeURIComponent(datetime)}`;
    const base = 'https://api.prokerala.com/v2/astrology';
    const auth = { Authorization: `Bearer ${token}` };

    // Safe fetch — never throws, returns null on error
    const safeFetch = async (url) => {
      try {
        const r = await fetch(url, { headers: auth });
        const json = await r.json();
        console.log(`${url.split('/').pop().split('?')[0]}:`, JSON.stringify(json?.data).substring(0, 200));
        return json;
      } catch (e) {
        console.error(`Failed: ${url}`, e.message);
        return null;
      }
    };

    // All 6 calls in parallel — safe
    const [planets, kundli, birth, dasha, yoga, mangal, kaalsarp] = await Promise.all([
      safeFetch(`${base}/planet-position?${params}`),
      safeFetch(`${base}/kundli?${params}`),
      safeFetch(`${base}/birth-details?${params}`),
      safeFetch(`${base}/dasha-periods?${params}`),
      safeFetch(`${base}/yoga-details?${params}`),
      safeFetch(`${base}/mangal-dosha?${params}`),
      safeFetch(`${base}/kaal-sarp-dosha?${params}`),
    ]);

    return res.status(200).json({ planets, kundli, birth, dasha, yoga, mangal, kaalsarp });

  } catch (err) {
    console.error('Fatal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
