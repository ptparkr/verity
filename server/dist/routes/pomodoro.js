"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../auth");
const db_1 = require("../db");
const time_1 = require("../utils/time");
const router = (0, express_1.Router)();
// POST /api/pomodoro — log a completed session
router.post('/', (req, res) => {
    const { focus_min, break_min, completed, area, intention, quality } = req.body;
    const ownerId = (0, auth_1.getOwnerId)(req);
    if (!focus_min) {
        res.status(400).json({ error: 'focus_min required' });
        return;
    }
    const db = (0, db_1.getDb)();
    db.run('INSERT INTO pomodoro_sessions (focus_min, break_min, completed, area, intention, quality, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [focus_min, break_min || 0, completed ? 1 : 0, area || 'other', intention || null, quality || null, ownerId]);
    (0, db_1.saveDb)();
    res.status(201).json({ success: true });
});
// GET /api/pomodoro/today — sessions completed today
router.get('/today', (req, res) => {
    const today = (0, time_1.toDateStr)();
    const ownerId = (0, auth_1.getOwnerId)(req);
    const db = (0, db_1.getDb)();
    const stmt = db.prepare("SELECT * FROM pomodoro_sessions WHERE date(created_at, 'localtime') = ? AND owner_id = ? ORDER BY created_at DESC");
    stmt.bind([today, ownerId]);
    const sessions = [];
    while (stmt.step()) {
        sessions.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(sessions);
});
// GET /api/pomodoro/recent — recent sessions for adaptive timer
router.get('/recent', (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const ownerId = (0, auth_1.getOwnerId)(req);
    const db = (0, db_1.getDb)();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = (0, time_1.toDateStr)(cutoff);
    const stmt = db.prepare(`
    SELECT * FROM pomodoro_sessions 
    WHERE completed = 1 AND quality IS NOT NULL AND owner_id = ? AND date(created_at, 'localtime') >= ?
    ORDER BY created_at DESC
  `);
    stmt.bind([ownerId, cutoffStr]);
    const sessions = [];
    while (stmt.step()) {
        sessions.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(sessions);
});
// GET /api/pomodoro/analytics — focus analytics
router.get('/analytics', (req, res) => {
    const db = (0, db_1.getDb)();
    const ownerId = (0, auth_1.getOwnerId)(req);
    const { startDate, endDate } = req.query;
    // If date range provided, use it; otherwise default to current week
    let rangeStart;
    let rangeEnd;
    let daysCount;
    if (startDate && endDate) {
        rangeStart = startDate;
        rangeEnd = endDate;
        const start = new Date(rangeStart);
        const end = new Date(rangeEnd);
        daysCount = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    else {
        const timeInfo = (0, time_1.getCurrentTimeInfo)();
        rangeStart = (0, time_1.toDateStr)(timeInfo.weekStart);
        rangeEnd = (0, time_1.toDateStr)(timeInfo.weekEnd);
        daysCount = 7;
    }
    // Focus by Area for the requested range
    const areaStmt = db.prepare(`
    SELECT area, SUM(focus_min) as total_min
    FROM pomodoro_sessions
    WHERE completed = 1 AND owner_id = ? AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?
    GROUP BY area
  `);
    areaStmt.bind([ownerId, rangeStart, rangeEnd]);
    const byArea = [];
    while (areaStmt.step()) {
        byArea.push(areaStmt.getAsObject());
    }
    areaStmt.free();
    // Focus by Day for the requested date range
    const dailyStmt = db.prepare(`
    SELECT date(created_at, 'localtime') as date, SUM(focus_min) as total_min
    FROM pomodoro_sessions
    WHERE completed = 1 AND owner_id = ? AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?
    GROUP BY date(created_at, 'localtime')
  `);
    dailyStmt.bind([ownerId, rangeStart, rangeEnd]);
    const byDayRaw = [];
    while (dailyStmt.step()) {
        byDayRaw.push(dailyStmt.getAsObject());
    }
    dailyStmt.free();
    // Generate all dates in range
    const weekDays = [];
    const startLocal = new Date(rangeStart + 'T00:00:00');
    for (let i = 0; i < daysCount; i++) {
        const d = new Date(startLocal);
        d.setDate(startLocal.getDate() + i);
        const dStr = (0, time_1.toDateStr)(d);
        const match = byDayRaw.find(r => r.date === dStr);
        weekDays.push({
            date: dStr,
            minutes: match ? match.total_min : 0
        });
    }
    res.json({ byArea, weekDays });
});
exports.default = router;
