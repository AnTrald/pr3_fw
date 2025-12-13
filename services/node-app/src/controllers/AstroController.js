const axios = require('axios');
const aws4 = require('aws4');

class AstroController {
    async events(req, res) {
        try {
            console.log('=== AstroController.events called ===');

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

            console.log('API credentials check:', {
                hasAppId: !!appId,
                hasSecret: !!secret
            });

            if (!appId || !secret) {
                console.error('Missing API credentials');
                return res.status(500).json({
                    success: false,
                    error: 'Missing ASTRO_APP_ID/ASTRO_APP_SECRET',
                    message: 'Проверьте настройки окружения'
                });
            }

            // Создаем опции для AWS Signature v4
            const opts = {
                host: 'api.astronomyapi.com',
                path: `/api/v2/bodies/events?latitude=${lat}&longitude=${lon}&from=${from}&to=${to}`,
                service: 'execute-api',
                region: 'us-east-1',
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            };

            console.log('AWS4 opts:', {
                host: opts.host,
                path: opts.path,
                service: opts.service,
                region: opts.region
            });

            // Подписываем запрос
            aws4.sign(opts, {
                accessKeyId: appId,
                secretAccessKey: secret
            });

            console.log('Signed headers:', Object.keys(opts.headers));

            const response = await axios.get(`https://${opts.host}${opts.path}`, {
                headers: opts.headers,
                timeout: 30000
            });

            console.log('Astro API success, status:', response.status);

            // Парсим события на сервере
            const events = this.parseAstroEvents(response.data);

            res.json({
                success: true,
                events: events,
                meta: {
                    lat,
                    lon,
                    from,
                    to,
                    days
                }
            });

        } catch (error) {
            console.error('AstroController error:', error.message);

            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);

                res.status(error.response.status || 500).json({
                    success: false,
                    error: 'API request failed',
                    code: error.response.status,
                    details: error.response.data,
                    message: 'Ошибка при запросе к Astronomy API'
                });
            } else if (error.request) {
                console.error('No response received:', error.request);
                res.status(503).json({
                    success: false,
                    error: 'No response from Astronomy API',
                    message: 'Нет ответа от Astronomy API'
                });
            } else {
                console.error('Request setup error:', error.message);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error',
                    message: 'Внутренняя ошибка сервера'
                });
            }
        }
    }

    // Метод для парсинга событий из Astronomy API
    parseAstroEvents(data) {
        const events = [];

        console.log('Parsing astro events, data structure:', {
            hasData: !!data,
            hasDataData: !!(data && data.data),
            isArray: Array.isArray(data?.data)
        });

        // Astronomy API возвращает данные в структуре data -> data -> events
        if (data && data.data && Array.isArray(data.data)) {
            console.log(`Found ${data.data.length} celestial bodies`);

            data.data.forEach((bodyData, index) => {
                if (bodyData.events && Array.isArray(bodyData.events)) {
                    console.log(`Body ${index + 1}: ${bodyData.name}, events: ${bodyData.events.length}`);

                    bodyData.events.forEach(event => {
                        events.push({
                            name: bodyData.name || bodyData.object || 'Неизвестно',
                            type: event.type || event.event_type || 'Событие',
                            when: event.date || event.time || event.occursAt || '',
                            extra: event.magnitude || event.mag || event.altitude || '',
                            details: event.details || event.note || ''
                        });
                    });
                }
            });
        }

        // Альтернативная структура (если события напрямую в массиве)
        if (events.length === 0 && Array.isArray(data.events)) {
            console.log(`Found ${data.events.length} events in data.events array`);

            data.events.forEach(event => {
                events.push({
                    name: event.body || event.object || event.target || 'Неизвестно',
                    type: event.type || event.kind || 'Событие',
                    when: event.date || event.time || '',
                    extra: event.magnitude || '',
                    details: ''
                });
            });
        }

        console.log(`Total parsed events: ${events.length}`);
        return events.slice(0, 100); // Ограничиваем количество
    }
}

module.exports = new AstroController();