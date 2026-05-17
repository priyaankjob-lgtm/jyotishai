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

    // Safe fetch — never crashes
    const safeFetch = async (url, name) => {
      try {
        const r = await fetch(url, { headers: auth });
        const json = await r.json();
        const preview = JSON.stringify(json?.data || json);
        console.log(`${name}:`, preview ? preview.substring(0, 200) : 'no data');
        return json;
      } catch (e) {
        console.error(`Failed ${name}:`, e.message);
        return { data: null, error: e.message };
      }
    };

    // All calls in parallel
    const [planets, kundli, birth, dasha, mangal, kaalsarp] = await Promise.all([
      safeFetch(`${base}/planet-position?${params}`, 'PLANETS'),
      safeFetch(`${base}/kundli?${params}`, 'KUNDLI'),
      safeFetch(`${base}/birth-details?${params}`, 'BIRTH'),
      safeFetch(`${base}/dasha-periods?${params}`, 'DASHA'),
      safeFetch(`${base}/mangal-dosha?${params}`, 'MANGAL'),
      safeFetch(`${base}/kaal-sarp-dosha?${params}`, 'KAALSARP'),
    ]);

    // Yoga — separate call with different endpoint format
    let yoga = { data: null };
    try {
      const yogaRes = await fetch(`${base}/yoga-details?ayanamsa=1&coordinates=${coordinates}&datetime=${encodeURIComponent(datetime)}&la=hi`, { headers: auth });
      yoga = await yogaRes.json();
      console.log('YOGA:', JSON.stringify(yoga?.data).substring(0, 200));
    } catch(e) {
      console.log('Yoga not available:', e.message);
    }

    return res.status(200).json({ planets, kundli, birth, dasha, yoga, mangal, kaalsarp });

  } catch (err) {
    console.error('Fatal:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
