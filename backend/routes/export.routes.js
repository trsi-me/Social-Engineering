const express = require('express');
const pool = require('../db');
const { parseId, sanitizeText } = require('../utils/helpers');
const { sendListExport, sendTargetExport } = require('../utils/export-document');

const router = express.Router();

async function loadTargetBundle(id) {
  const [targets] = await pool.query(
    'SELECT * FROM targets WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!targets.length) return null;
  const [[documents], [notes], [social], [timeline], [cards]] = await Promise.all([
    pool.query(
      'SELECT id, target_id, title, description, original_name, mime_type, size_bytes, created_at FROM documents WHERE target_id = ? ORDER BY created_at DESC',
      [id]
    ),
    pool.query('SELECT * FROM notes WHERE target_id = ? ORDER BY created_at DESC', [id]),
    pool.query('SELECT * FROM social_accounts WHERE target_id = ? ORDER BY created_at DESC', [id]),
    pool.query(
      'SELECT * FROM timeline_events WHERE target_id = ? ORDER BY event_at DESC, id DESC',
      [id]
    ),
    pool.query(
      `SELECT id, target_id, cardholder_name, brand, card_number, last_four, exp_month, exp_year, cvv, bank_name, notes, created_at
       FROM bank_cards WHERE target_id = ? ORDER BY created_at DESC`,
      [id]
    )
  ]);
  return {
    target: targets[0],
    documents,
    notes,
    social,
    timeline,
    cards
  };
}

router.get('/targets', async (req, res) => {
  try {
    const format = sanitizeText(req.query.format, 10) || 'pdf';
    const status = req.query.status === 'archived' || req.query.status === 'active'
      ? req.query.status
      : null;
    const params = [];
    let sql = 'SELECT * FROM targets WHERE deleted_at IS NULL';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    sql += ' ORDER BY updated_at DESC, id DESC';
    const [rows] = await pool.query(sql, params);
    await sendListExport(res, format, rows);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message || 'فشل التصدير' });
  }
});

router.get('/targets/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'معرّف غير صالح' });
    const format = sanitizeText(req.query.format, 10) || 'pdf';
    const bundle = await loadTargetBundle(id);
    if (!bundle) return res.status(404).json({ error: 'الملف غير موجود' });
    await sendTargetExport(res, format, bundle);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: e.message || 'فشل التصدير' });
  }
});

module.exports = router;
