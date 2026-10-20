"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.ensureDbReady = ensureDbReady;
exports.createServerApp = createServerApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const db_1 = require("./db");
const habits_1 = __importDefault(require("./routes/habits"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const areas_1 = __importDefault(require("./routes/areas"));
const utils_1 = __importDefault(require("./routes/utils"));
const health_1 = __importDefault(require("./routes/health"));
let dbInitPromise = null;
async function ensureDbReady() {
    if (!dbInitPromise) {
        dbInitPromise = (0, db_1.initDb)();
    }
    await dbInitPromise;
}
function asyncHandler(handler) {
    return (req, res, next) => {
        void handler(req, res, next);
    };
}
function createServerApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(asyncHandler(async (_req, _res, next) => {
        try {
            await ensureDbReady();
            next();
        }
        catch (error) {
            next(error);
        }
    }));
    app.use('/api/habits', habits_1.default);
    app.use('/api/dashboard', dashboard_1.default);
    app.use('/api/areas', areas_1.default);
    app.use('/api/utils', utils_1.default);
    app.use('/api/health', health_1.default);
    app.use((error, _req, res, _next) => {
        const message = error instanceof Error ? error.message : 'Unexpected server error';
        res.status(500).json({ error: message });
    });
    return app;
}
exports.app = createServerApp();
