const express = require('express');
const pool = require('../db');
const { sanitizeText, parseId } = require('../utils/helpers');

const router = express.Router({ mergeParams: true });

async function assertTarget(targetId) {
  const [rows] = await pool.query(
    'SELECT id FROM targets WHERE id = ? AND deleted_at IS NULL',
    [targetId]
  );
  return rows.length > 0;
}

function parseEventAt(v) {
  const raw = sanitizeText(v, 32);
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(raw)) {
    const d = new Date(raw.replace(' ', 'T'));
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });
    const [rows] = await pool.query(
      'SELECT * FROM timeline_events WHERE target_id = ? ORDER BY event_at DESC, id DESC',
      [targetId]
    );
    res.json({ timeline: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب السجل الزمني' });
  }
});

router.post('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });

    const body = req.body || {};
    const title = sanitizeText(body.title, 200);
    if (!title) return res.status(400).json({ error: 'عنوان الحدث مطلوب' });
    const eventAt = parseEventAt(body.event_at);
    if (!eventAt) return res.status(400).json({ error: 'وقت الحدث غير صالح' });

    const [result] = await pool.query(
      `INSERT INTO timeline_events (target_id, event_at, title, description, source)
       VALUES (?, ?, ?, ?, ?)`,
      [
        targetId,
        eventAt,
        title,
        sanitizeText(body.description, 4000),
        sanitizeText(body.source, 200)
      ]
    );
    const [rows] = await pool.query('SELECT * FROM timeline_events WHERE id = ?', [result.insertId]);
    res.status(201).json({ event: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر إضافة الحدث' });
  }
});

router.put('/:eventId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const eventId = parseId(req.params.eventId);
    if (!targetId || !eventId) return res.status(400).json({ error: 'معرّف غير صالح' });

    const body = req.body || {};
    const title = sanitizeText(body.title, 200);
    if (!title) return res.status(400).json({ error: 'عنوان الحدث مطلوب' });
    const eventAt = parseEventAt(body.event_at);
    if (!eventAt) return res.status(400).json({ error: 'وقت الحدث غير صالح' });

    const [result] = await pool.query(
      `UPDATE timeline_events SET event_at = ?, title = ?, description = ?, source = ?
       WHERE id = ? AND target_id = ?`,
      [
        eventAt,
        title,
        sanitizeText(body.description, 4000),
        sanitizeText(body.source, 200),
        eventId,
        targetId
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الحدث غير موجود' });
    const [rows] = await pool.query('SELECT * FROM timeline_events WHERE id = ?', [eventId]);
    res.json({ event: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر تحديث الحدث' });
  }
});

router.delete('/:eventId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const eventId = parseId(req.params.eventId);
    if (!targetId || !eventId) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [result] = await pool.query(
      'DELETE FROM timeline_events WHERE id = ? AND target_id = ?',
      [eventId, targetId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الحدث غير موجود' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حذف الحدث' });
  }
});

module.exports = router;
