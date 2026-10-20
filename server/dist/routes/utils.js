"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const time_1 = require("../utils/time");
const router = (0, express_1.Router)();
/**
 * GET /api/utils/time
 * Returns standardized time information from the server.
 * This can be used to synchronize clients and ensure consistent "Today" definitions.
 */
router.get('/time', (_req, res) => {
    try {
        const timeInfo = (0, time_1.getCurrentTimeInfo)();
        res.json(timeInfo);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to retrieve time information' });
    }
});
exports.default = router;
