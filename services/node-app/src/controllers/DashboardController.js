const axios = require('axios');
const JwstHelper = require('./JwstHelper');

class DashboardController {
    base() {
        return process.env.RUST_BASE || 'http://rust_iss:3000';
    }

    async getJson(url, qs = {}) {
        try {
            if (Object.keys(qs).length > 0) {
                const queryString = new URLSearchParams(qs).toString();
                url += (url.includes('?') ? '&' : '?') + queryString;
            }

            const response = await axios.get(url, { timeout: 5000 });
            return response.data || {};
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            return {};
        }
    }

    async index(req, res) {
        try {
            const base = this.base();
            const iss = await this.getJson(`${base}/last`);

            res.render('dashboard', {
                iss: iss,
                trend: {},
                jw_gallery: [],
                jw_observation_raw: [],
                jw_observation_summary: [],
                jw_observation_images: [],
                jw_observation_files: [],
                metrics: {
                    iss_speed: iss.payload?.velocity || null,
                    iss_alt: iss.payload?.altitude || null,
                    neo_total: 0
                }
            });
        } catch (error) {
            console.error('DashboardController error:', error.message);
            res.render('dashboard', {
                iss: {},
                trend: {},
                metrics: {}
            });
        }
    }

    async jwstFeed(req, res) {
        try {
            const src = req.query.source || 'jpg';
            const sfx = req.query.suffix?.trim() || '';
            const prog = req.query.program?.trim() || '';
            const instF = req.query.instrument?.toUpperCase().trim() || '';
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const per = Math.max(1, Math.min(60, parseInt(req.query.perPage) || 24));

            const jwstHelper = new JwstHelper();

            let path = 'all/type/jpg';
            if (src === 'suffix' && sfx !== '') path = 'all/suffix/' + encodeURIComponent(sfx);
            if (src === 'program' && prog !== '') path = 'program/id/' + encodeURIComponent(prog);

            const response = await jwstHelper.get(path, { page, perPage: per });
            const list = response.body || response.data || (Array.isArray(response) ? response : []);

            const items = [];

            for (const item of list) {
                if (!item || typeof item !== 'object') continue;

                let url = null;
                const loc = item.location || item.url || null;
                const thumb = item.thumbnail || null;

                for (const u of [loc, thumb]) {
                    if (typeof u === 'string' && /\.(jpg|jpeg|png)(\?.*)?$/i.test(u)) {
                        url = u;
                        break;
                    }
                }

                if (!url) {
                    url = JwstHelper.pickImageUrl(item);
                }
                if (!url) continue;

                const instList = [];
                const instruments = item.details?.instruments || [];
                for (const inst of instruments) {
                    if (inst && inst.instrument) {
                        instList.push(inst.instrument.toUpperCase());
                    }
                }

                if (instF && instList.length > 0 && !instList.includes(instF)) continue;

                items.push({
                    url: url,
                    obs: String(item.observation_id || item.observationId || ''),
                    program: String(item.program || ''),
                    suffix: String(item.details?.suffix || item.suffix || ''),
                    inst: instList,
                    caption: [
                        item.observation_id || item.id || '',
                        'P' + (item.program || '-'),
                        item.details?.suffix ? ' · ' + item.details.suffix : '',
                        instList.length > 0 ? ' · ' + instList.join('/') : ''
                    ].filter(Boolean).join(' · '),
                    link: loc || url
                });

                if (items.length >= per) break;
            }

            res.json({
                source: path,
                count: items.length,
                items: items
            });

        } catch (error) {
            console.error('JWST feed error:', error.message);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new DashboardController();