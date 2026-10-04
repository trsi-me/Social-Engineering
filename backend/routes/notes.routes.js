const express = require('express');
const pool = require('../db');
const {
  sanitizeText,
  parseId,
  isSafeHttpUrl,
  NOTE_TYPE_LABELS
} = require('../utils/helpers');

const router = express.Router({ mergeParams: true });

async function assertTarget(targetId) {
  const [rows] = await pool.query(
    'SELECT id FROM targets WHERE id = ? AND deleted_at IS NULL',
    [targetId]
  );
  return rows.length > 0;
}

function mapNote(row) {
  return { ...row, note_type_label: NOTE_TYPE_LABELS[row.note_type] || row.note_type };
}

router.get('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });
    const [rows] = await pool.query(
      'SELECT * FROM notes WHERE target_id = ? ORDER BY created_at DESC',
      [targetId]
    );
    res.json({ notes: rows.map(mapNote) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب الملاحظات' });
  }
});

router.post('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });

    const body = req.body || {};
    const title = sanitizeText(body.title, 200);
    if (!title) return res.status(400).json({ error: 'عنوان الملاحظة مطلوب' });
    const noteType = ['note', 'link', 'investigation'].includes(body.note_type)
      ? body.note_type
      : 'note';
    const url = sanitizeText(body.url, 500);
    if (url && !isSafeHttpUrl(url)) return res.status(400).json({ error: 'رابط غير صالح' });

    const [result] = await pool.query(
      'INSERT INTO notes (target_id, title, body, note_type, url) VALUES (?, ?, ?, ?, ?)',
      [targetId, title, sanitizeText(body.body, 8000), noteType, url]
    );
    const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [result.insertId]);
    res.status(201).json({ note: mapNote(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر إضافة الملاحظة' });
  }
});

router.put('/:noteId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const noteId = parseId(req.params.noteId);
    if (!targetId || !noteId) return res.status(400).json({ error: 'معرّف غير صالح' });

    const body = req.body || {};
    const title = sanitizeText(body.title, 200);
    if (!title) return res.status(400).json({ error: 'عنوان الملاحظة مطلوب' });
    const noteType = ['note', 'link', 'investigation'].includes(body.note_type)
      ? body.note_type
      : 'note';
    const url = sanitizeText(body.url, 500);
    if (url && !isSafeHttpUrl(url)) return res.status(400).json({ error: 'رابط غير صالح' });

    const [result] = await pool.query(
      `UPDATE notes SET title = ?, body = ?, note_type = ?, url = ?
       WHERE id = ? AND target_id = ?`,
      [title, sanitizeText(body.body, 8000), noteType, url, noteId, targetId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الملاحظة غير موجودة' });
    const [rows] = await pool.query('SELECT * FROM notes WHERE id = ?', [noteId]);
    res.json({ note: mapNote(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر تحديث الملاحظة' });
  }
});

router.delete('/:noteId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const noteId = parseId(req.params.noteId);
    if (!targetId || !noteId) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [result] = await pool.query(
      'DELETE FROM notes WHERE id = ? AND target_id = ?',
      [noteId, targetId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الملاحظة غير موجودة' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حذف الملاحظة' });
  }
});

module.exports = router;
