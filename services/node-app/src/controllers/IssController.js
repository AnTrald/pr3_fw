const axios = require('axios');

class IssController {
    async index(req, res) {
        try {
            const base = process.env.RUST_BASE || 'http://rust_iss:3000';

            // Параллельно получаем данные как в PHP
            const [lastResponse, trendResponse] = await Promise.allSettled([
                axios.get(`${base}/last`, { timeout: 5000 }).catch(() => null),
                axios.get(`${base}/iss/trend`, { timeout: 5000 }).catch(() => null)
            ]);

            const lastJson = lastResponse.status === 'fulfilled' && lastResponse.value ?
                lastResponse.value.data : {};
            const trendJson = trendResponse.status === 'fulfilled' && trendResponse.value ?
                trendResponse.value.data : {};

            res.render('iss', {
                last: lastJson,
                trend: trendJson,
                base: base
            });

        } catch (error) {
            console.error('IssController error:', error.message);
            res.render('iss', {
                last: {},
                trend: {},
                base: process.env.RUST_BASE || 'http://rust_iss:3000'
            });
        }
    }
}

module.exports = new IssController();