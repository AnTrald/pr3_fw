const axios = require('axios');

class ProxyController {
    base() {
        return process.env.RUST_BASE || 'http://rust_iss:3000';
    }

    async last(req, res) {
        return this.pipe('/last', req, res);
    }

    async trend(req, res) {
        const queryString = new URLSearchParams(req.query).toString();
        const path = '/iss/trend' + (queryString ? '?' + queryString : '');
        return this.pipe(path, req, res);
    }

    async pipe(path, req, res) {
        const url = this.base() + path;

        try {
            const response = await axios.get(url, {
                timeout: 5000,
                validateStatus: () => true // Принимаем любые статусы как в PHP
            });

            let body = response.data;
            
            if (!body || typeof body === 'string' && body.trim() === '') {
                body = '{}';
            }

            try {
                JSON.parse(typeof body === 'string' ? body : JSON.stringify(body));
            } catch (e) {
                body = '{}';
            }

            res.set('Content-Type', 'application/json');
            res.send(typeof body === 'string' ? body : JSON.stringify(body));

        } catch (error) {
            console.error('ProxyController error:', error.message);
            res.set('Content-Type', 'application/json');
            res.status(200).send('{"error":"upstream"}');
        }
    }
}

module.exports = new ProxyController();