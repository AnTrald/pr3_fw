class VerifyCsrfToken {
    constructor() {
        this.except = ['/upload'];
    }

    handle(req, res, next) {
        const path = req.path;

        if (this.except.includes(path)) {
            return next();
        }

        const token = req.body._token || req.headers['x-csrf-token'] || req.query._token;
        
        next();
    }
}

module.exports = new VerifyCsrfToken();