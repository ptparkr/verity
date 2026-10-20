"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
const DEFAULT_AREAS = [
    ['play', '#58a6ff'],
    ['health', '#3fb950'],
    ['mind', '#bc8cff'],
    ['social', '#f0883e'],
];
function ensureDefaultAreas(ownerId) {
    const db = (0, db_1.getDb)();
    const countStmt = db.prepare('SELECT COUNT(*) as c FROM areas WHERE owner_id = ?');
    countStmt.bind([ownerId]);
    countStmt.step();
    const count = countStmt.getAsObject().c;
    countStmt.free();
    if (count > 0)
        return;
    for (const [name, color] of DEFAULT_AREAS) {
        db.run('INSERT INTO areas (owner_id, name, color) VALUES (?, ?, ?)', [ownerId, name, color]);
    }
    (0, db_1.saveDb)();
}
// GET /api/areas — list all areas with colors
router.get('/', (req, res) => {
    const ownerId = (0, auth_1.getOwnerId)(req);
    ensureDefaultAreas(ownerId);
    const db = (0, db_1.getDb)();
    const stmt = db.prepare('SELECT name, color FROM areas WHERE owner_id = ? ORDER BY name');
    stmt.bind([ownerId]);
    const areas = [];
    while (stmt.step()) {
        areas.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(areas);
});
// PUT /api/areas/:name — update area color
router.put('/:name', (req, res) => {
    const { name } = req.params;
    const { color } = req.body;
    const ownerId = (0, auth_1.getOwnerId)(req);
    if (!color) {
        res.status(400).json({ error: 'color required' });
        return;
    }
    const db = (0, db_1.getDb)();
    // Upsert: update if exists, insert if not
    const stmt = db.prepare('SELECT name FROM areas WHERE owner_id = ? AND name = ?');
    stmt.bind([ownerId, name]);
    const exists = stmt.step();
    stmt.free();
    if (exists) {
        db.run('UPDATE areas SET color = ? WHERE owner_id = ? AND name = ?', [color, ownerId, name]);
    }
    else {
        db.run('INSERT INTO areas (owner_id, name, color) VALUES (?, ?, ?)', [ownerId, name, color]);
    }
    (0, db_1.saveDb)();
    res.json({ name, color });
});
// DELETE /api/areas/:name — delete area and cascade to habits
router.delete('/:name', (req, res) => {
    const { name } = req.params;
    const ownerId = (0, auth_1.getOwnerId)(req);
    const db = (0, db_1.getDb)();
    // Find all habit IDs for this area
    const stmt = db.prepare('SELECT id FROM habits WHERE owner_id = ? AND area = ?');
    stmt.bind([ownerId, name]);
    const habitIds = [];
    while (stmt.step()) {
        habitIds.push(stmt.getAsObject().id);
    }
    stmt.free();
    // Delete all checkins for these habits
    for (const id of habitIds) {
        db.run('DELETE FROM checkins WHERE habit_id = ? AND owner_id = ?', [id, ownerId]);
    }
    // Delete the habits
    db.run('DELETE FROM habits WHERE area = ? AND owner_id = ?', [name, ownerId]);
    // Delete the area
    db.run('DELETE FROM areas WHERE name = ? AND owner_id = ?', [name, ownerId]);
    (0, db_1.saveDb)();
    res.json({ deleted: true });
});
exports.default = router;
