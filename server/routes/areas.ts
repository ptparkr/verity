import { Router, Request, Response } from 'express';
import { getOwnerId } from '../auth';
import { getDb, saveDb } from '../db';

const router = Router();
const DEFAULT_AREAS = [
  ['play', '#58a6ff'],
  ['health', '#3fb950'],
  ['mind', '#bc8cff'],
  ['social', '#f0883e'],
] as const;

function ensureDefaultAreas(ownerId: string) {
  const db = getDb();
  const countStmt = db.prepare('SELECT COUNT(*) as c FROM areas WHERE owner_id = ?');
  countStmt.bind([ownerId]);
  countStmt.step();
  const count = (countStmt.getAsObject() as any).c;
  countStmt.free();

  if (count > 0) return;

  for (const [name, color] of DEFAULT_AREAS) {
    db.run('INSERT INTO areas (owner_id, name, color) VALUES (?, ?, ?)', [ownerId, name, color]);
  }
  saveDb();
}

// GET /api/areas — list all areas with colors
router.get('/', (req: Request, res: Response) => {
  const ownerId = getOwnerId(req);
  ensureDefaultAreas(ownerId);
  const db = getDb();
  const stmt = db.prepare('SELECT name, color FROM areas WHERE owner_id = ? ORDER BY name');
  stmt.bind([ownerId]);
  const areas: any[] = [];
  while (stmt.step()) {
    areas.push(stmt.getAsObject());
  }
  stmt.free();
  res.json(areas);
});

// PUT /api/areas/:name — update area color
router.put('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const { color } = req.body;
  const ownerId = getOwnerId(req);
  if (!color) {
    res.status(400).json({ error: 'color required' });
    return;
  }
  const db = getDb();

  // Upsert: update if exists, insert if not
  const stmt = db.prepare('SELECT name FROM areas WHERE owner_id = ? AND name = ?');
  stmt.bind([ownerId, name]);
  const exists = stmt.step();
  stmt.free();

  if (exists) {
    db.run('UPDATE areas SET color = ? WHERE owner_id = ? AND name = ?', [color, ownerId, name]);
  } else {
    db.run('INSERT INTO areas (owner_id, name, color) VALUES (?, ?, ?)', [ownerId, name, color]);
  }
  saveDb();
  res.json({ name, color });
});

// DELETE /api/areas/:name — delete area and cascade to habits
router.delete('/:name', (req: Request, res: Response) => {
  const { name } = req.params;
  const ownerId = getOwnerId(req);
  const db = getDb();
  
  // Find all habit IDs for this area
  const stmt = db.prepare('SELECT id FROM habits WHERE owner_id = ? AND area = ?');
  stmt.bind([ownerId, name]);
  const habitIds: string[] = [];
  while (stmt.step()) {
    habitIds.push(stmt.getAsObject().id as string);
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

  saveDb();
  res.json({ deleted: true });
});

export default router;
