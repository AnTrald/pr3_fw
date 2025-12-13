const axios = require('axios');

class AstroController {
    async events(req, res) {
        try {
            const lat = parseFloat(req.query.lat) || 55.7558;
            const lon = parseFloat(req.query.lon) || 37.6176;
            const days = Math.max(1, Math.min(30, parseInt(req.query.days) || 7));

            const now = new Date();
            const from = now.toISOString().split('T')[0];

            const toDate = new Date(now);
            toDate.setDate(toDate.getDate() + days);
            const to = toDate.toISOString().split('T')[0];

            const appId = process.env.ASTRO_APP_ID || '';
            const secret = process.env.ASTRO_APP_SECRET || '';

            if (!appId || !secret) {
                return res.status(500).json({ error: 'Missing ASTRO_APP_ID/ASTRO_APP_SECRET' });
            }

            const auth = Buffer.from(`${appId}:${secret}`).toString('base64');
            const url = `https://api.astronomyapi.com/api/v2/bodies/events?` +
                new URLSearchParams({
                    latitude: lat,
                    longitude: lon,
                    from: from,
                    to: to
                }).toString();

            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'monolith-iss/1.0'
                },
                timeout: 25000
            });

            res.json(response.data);

        } catch (error) {
            console.error('AstroController error:', error.message);
            if (error.response) {
                res.status(error.response.status || 403).json({
                    error: error.message,
                    code: error.response.status,
                    raw: error.response.data
                });
            } else {
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    }
}

module.exports = new AstroController();