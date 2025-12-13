const axios = require('axios');

class JwstHelper {
    constructor() {
        this.host = (process.env.JWST_HOST || 'https://api.jwstapi.com').replace(/\/$/, '');
        this.key = process.env.JWST_API_KEY || '';
        this.email = process.env.JWST_EMAIL || null;
    }

    async get(path, qs = {}) {
        try {
            let url = this.host + '/' + path.replace(/^\//, '');

            if (Object.keys(qs).length > 0) {
                const queryString = new URLSearchParams(qs).toString();
                url += (url.includes('?') ? '&' : '?') + queryString;
            }

            const headers = {
                'x-api-key': this.key
            };

            if (this.email) {
                headers['email'] = this.email;
            }

            const response = await axios.get(url, {
                headers: headers,
                timeout: 30000
            });

            return response.data || {};
        } catch (error) {
            console.error('JWST API error:', error.message);
            return {};
        }
    }

    static pickImageUrl(item) {
        const stack = [item];

        while (stack.length > 0) {
            const current = stack.pop();

            for (const value of Object.values(current)) {
                if (typeof value === 'string' && /^https?:\/\/.*\.(?:jpg|jpeg|png)$/i.test(value)) {
                    return value;
                }
                if (value && typeof value === 'object') {
                    stack.push(value);
                }
            }
        }

        return null;
    }
}

module.exports = JwstHelper;