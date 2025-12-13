const axios = require('axios');

class OsdrController {
    async index(req, res) {
        try {
            const limit = req.query.limit || '20';
            const base = process.env.RUST_BASE || 'http://rust_iss:3000';

            const response = await axios.get(`${base}/osdr/list?limit=${limit}`, {
                timeout: 5000
            }).catch(() => ({ data: { items: [] } }));

            const data = response.data || { items: [] };
            const items = data.items || [];

            const flattenedItems = this.flattenOsdr(items);

            res.render('osdr', {
                items: flattenedItems,
                src: `${base}/osdr/list?limit=${limit}`
            });
        } catch (error) {
            console.error('OsdrController error:', error.message);
            res.render('osdr', {
                items: [],
                src: ''
            });
        }
    }

    flattenOsdr(items) {
        const out = [];

        for (const row of items) {
            const raw = row.raw || [];

            if (Array.isArray(raw) && this.looksOsdrDict(raw)) {
                for (const [k, v] of Object.entries(raw)) {
                    if (!v || typeof v !== 'object') continue;

                    const rest = v.REST_URL || v.rest_url || v.rest || null;
                    let title = v.title || v.name || null;

                    if (!title && typeof rest === 'string') {
                        title = require('path').basename(rest.replace(/\/$/, ''));
                    }

                    out.push({
                        id: row.id,
                        dataset_id: k,
                        title: title,
                        status: row.status || null,
                        updated_at: row.updated_at || null,
                        inserted_at: row.inserted_at || null,
                        rest_url: rest,
                        raw: v
                    });
                }
            } else {
                const rest_url = (raw && typeof raw === 'object') ?
                    (raw.REST_URL || raw.rest_url || null) : null;
                out.push({ ...row, rest_url });
            }
        }

        return out;
    }

    looksOsdrDict(raw) {
        if (!raw || typeof raw !== 'object') return false;

        for (const [k, v] of Object.entries(raw)) {
            if (typeof k === 'string' && k.startsWith('OSD-')) return true;
            if (v && typeof v === 'object' && (v.REST_URL || v.rest_url)) return true;
        }

        return false;
    }
}

module.exports = new OsdrController();