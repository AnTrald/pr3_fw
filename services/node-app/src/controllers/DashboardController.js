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

            // Параллельно получаем ВСЕ данные для дашборда
            const [issData, trendData, jwstGallery, osdrData] = await Promise.allSettled([
                this.getJson(`${base}/last`),
                this.getJson(`${base}/iss/trend`, { limit: 240 }),
                this.getJwstGallery({ perPage: 24 }),
                this.getOsdrData({ limit: 50 })
            ]);

            // Обрабатываем результаты
            const iss = issData.status === 'fulfilled' ? issData.value : {};
            const trend = trendData.status === 'fulfilled' ? trendData.value : {};
            const jwstItems = jwstGallery.status === 'fulfilled' ? jwstGallery.value : [];
            const osdrItems = osdrData.status === 'fulfilled' ? osdrData.value : [];

            // Готовим данные для отображения
            const preparedData = {
                // Данные МКС
                iss: iss,
                trend: this.prepareTrendData(trend),

                // Данные JWST
                jwstGallery: this.prepareJwstData(jwstItems),

                // Данные OSDR
                osdrData: this.prepareOsdrData(osdrItems),

                // Статистика
                metrics: this.calculateMetrics(iss, trend, jwstItems, osdrItems),

                // Метаданные для фильтров
                filters: {
                    jwstInstruments: this.extractUniqueInstruments(jwstItems),
                    jwstPrograms: this.extractUniquePrograms(jwstItems),
                    osdrStatuses: this.extractUniqueStatuses(osdrItems)
                }
            };

            res.render('dashboard', preparedData);

        } catch (error) {
            console.error('DashboardController error:', error.message);
            res.render('dashboard', {
                iss: {},
                trend: {},
                jwstGallery: [],
                osdrData: [],
                metrics: {},
                filters: {}
            });
        }
    }

    // ====== ПОДГОТОВКА ДАННЫХ JWST ======
    async getJwstGallery(params = {}) {
        try {
            const jwstHelper = new JwstHelper();
            const response = await jwstHelper.get('all/type/jpg', {
                page: 1,
                perPage: params.perPage || 24
            });

            return response.body || response.data || [];
        } catch (error) {
            console.error('getJwstGallery error:', error.message);
            return [];
        }
    }

    prepareJwstData(items) {
        return items.map(item => {
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

            const instList = [];
            const instruments = item.details?.instruments || [];
            for (const inst of instruments) {
                if (inst && inst.instrument) {
                    instList.push(inst.instrument.toUpperCase());
                }
            }

            return {
                url: url || '/images/placeholder.jpg',
                obs: String(item.observation_id || item.observationId || item.id || ''),
                program: String(item.program || ''),
                suffix: String(item.details?.suffix || item.suffix || ''),
                instruments: instList,
                caption: [
                    item.observation_id || item.id || '',
                    'P' + (item.program || '-'),
                    item.details?.suffix ? ' · ' + item.details.suffix : '',
                    instList.length > 0 ? ' · ' + instList.join('/') : ''
                ].filter(Boolean).join(' · '),
                link: loc || url,
                timestamp: item.timestamp || Date.now()
            };
        }).filter(item => item.url); // Фильтруем элементы без изображений
    }

    extractUniqueInstruments(items) {
        const instruments = new Set();
        items.forEach(item => {
            if (item.instruments && Array.isArray(item.instruments)) {
                item.instruments.forEach(inst => instruments.add(inst));
            }
        });
        return Array.from(instruments).sort();
    }

    extractUniquePrograms(items) {
        const programs = new Set();
        items.forEach(item => {
            if (item.program) {
                programs.add(item.program);
            }
        });
        return Array.from(programs).sort();
    }

    // ====== ПОДГОТОВКА ДАННЫХ OSDR ======
    async getOsdrData(params = {}) {
        try {
            const base = this.base();
            const response = await axios.get(`${base}/osdr/list`, {
                params: { limit: params.limit || 50 },
                timeout: 5000
            });

            const data = response.data || {};
            return data.items || [];
        } catch (error) {
            console.error('getOsdrData error:', error.message);
            return [];
        }
    }

    prepareOsdrData(items) {
        return items.map(item => ({
            id: item.id || '',
            dataset_id: item.dataset_id || '',
            title: item.title || 'Без названия',
            status: item.status || 'unknown',
            updated_at: item.updated_at || null,
            inserted_at: item.inserted_at || null,
            rest_url: item.rest_url || null,
            raw: item.raw || {}
        }));
    }

    extractUniqueStatuses(items) {
        const statuses = new Set();
        items.forEach(item => {
            if (item.status) {
                statuses.add(item.status.toLowerCase());
            }
        });
        return Array.from(statuses).sort();
    }

    // ====== ПОДГОТОВКА ДАННЫХ TREND ======
    prepareTrendData(trend) {
        if (!trend || !trend.points || !Array.isArray(trend.points)) {
            return { points: [], movement: false, delta_km: 0 };
        }

        const points = trend.points.map(point => ({
            lat: point.lat || 0,
            lon: point.lon || 0,
            altitude: point.altitude || 0,
            velocity: point.velocity || 0,
            at: point.at || new Date().toISOString(),
            timeLabel: point.at ? new Date(point.at).toLocaleTimeString() : ''
        }));

        return {
            points: points.slice(-100), // Берем последние 100 точек
            movement: trend.movement || false,
            delta_km: trend.delta_km || 0,
            velocity_kmh: trend.velocity_kmh || 0,
            dt_sec: trend.dt_sec || 0
        };
    }

    // ====== РАСЧЕТ МЕТРИК ======
    calculateMetrics(iss, trend, jwstItems, osdrItems) {
        return {
            iss_speed: iss.payload?.velocity || null,
            iss_alt: iss.payload?.altitude || null,
            iss_lat: iss.payload?.latitude || null,
            iss_lon: iss.payload?.longitude || null,
            jwst_count: jwstItems.length,
            osdr_count: osdrItems.length,
            trend_points: trend.points?.length || 0,
            last_update: new Date().toISOString()
        };
    }

    // ====== API ENDPOINT ДЛЯ JWST ======
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
            const list = response.body || response.data || [];

            const items = this.prepareJwstData(list);

            // Фильтрация по инструменту (если указан)
            const filteredItems = instF ?
                items.filter(item => item.instruments.includes(instF)) :
                items;

            res.json({
                success: true,
                source: path,
                count: filteredItems.length,
                items: filteredItems.slice(0, per)
            });

        } catch (error) {
            console.error('JWST feed error:', error.message);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}

module.exports = new DashboardController();
