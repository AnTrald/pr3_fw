require('dotenv').config();
const express = require('express');
const path = require('path');
const webRoutes = require('./routes/web');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const redis = require('redis');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: false
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов с вашего IP'
});

app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    res.locals.env = process.env.NODE_ENV || 'development';
    next();
});

app.use('/', webRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
    res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).send('Internal server error');
});

const PORT = process.env.PORT || 3000;

async function startServer() {
    if (process.env.REDIS_URL) {
        try {
            const redisClient = redis.createClient({
                url: process.env.REDIS_URL
            });
            await redisClient.connect();
            app.locals.redis = redisClient;
            console.log('Redis connected successfully');
        } catch (error) {
            console.warn('Redis connection failed, continuing without cache');
        }
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

startServer();

process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    if (app.locals.redis) {
        app.locals.redis.quit();
    }
    process.exit(0);
});