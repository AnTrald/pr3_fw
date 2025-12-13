const express = require('express');
const router = express.Router();

// Контроллеры
const DashboardController = require('../controllers/DashboardController');
const OsdrController = require('../controllers/OsdrController');
const ProxyController = require('../controllers/ProxyController');
const AstroController = require('../controllers/AstroController');
const CmsController = require('../controllers/CmsController');
const IssController = require('../controllers/IssController');
const UploadController = require('../controllers/UploadController');

// Middleware
const VerifyCsrfToken = require('../middleware/VerifyCsrfToken');

router.use(VerifyCsrfToken.handle.bind(VerifyCsrfToken));

router.get('/', (req, res) => res.redirect('/dashboard'));


router.get('/dashboard', DashboardController.index.bind(DashboardController));
router.get('/osdr', OsdrController.index.bind(OsdrController));
router.get('/iss', IssController.index.bind(IssController));


router.get('/api/iss/last', ProxyController.last.bind(ProxyController));
router.get('/api/iss/trend', ProxyController.trend.bind(ProxyController));

router.get('/api/jwst/feed', DashboardController.jwstFeed.bind(DashboardController));


router.get('/api/astro/events', AstroController.events.bind(AstroController));


router.get('/page/:slug', CmsController.page.bind(CmsController));


router.post('/upload', UploadController.store.bind(UploadController));

module.exports = router;