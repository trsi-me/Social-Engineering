const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const { sanitizeText, parseId } = require('../utils/helpers');

const router = express.Router({ mergeParams: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const maxMb = Number(process.env.UPLOAD_MAX_MB || 20);

function ensureTargetDir(targetId) {
  const dir = path.join(process.cwd(), 'uploads', 'targets', String(targetId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function assertTarget(targetId) {
  const [rows] = await pool.query(
    'SELECT id FROM targets WHERE id = ? AND deleted_at IS NULL',
    [targetId]
  );
  return rows.length > 0;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      const targetId = parseId(req.params.targetId);
      if (!targetId) return cb(new Error('معرّف غير صالح'));
      cb(null, ensureTargetDir(targetId));
    } catch (e) {
      cb(e);
    }
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').slice(0, 20).replace(/[^\w.]/g, '');
    const name = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('نوع الملف غير مسموح'));
    }
    cb(null, true);
  }
});

router.get('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });
    const [rows] = await pool.query(
      'SELECT id, target_id, title, description, original_name, mime_type, size_bytes, created_at FROM documents WHERE target_id = ? ORDER BY created_at DESC',
      [targetId]
    );
    res.json({ documents: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب المستندات' });
  }
});

router.post('/', (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        console.error(err);
        return res.status(400).json({ error: err.message || 'فشل رفع الملف' });
      }
      const targetId = parseId(req.params.targetId);
      if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
      if (!(await assertTarget(targetId))) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'الملف غير موجود' });
      }
      if (!req.file) return res.status(400).json({ error: 'الملف مطلوب' });

      const title = sanitizeText(req.body.title, 200) || sanitizeText(req.file.originalname, 200);
      const description = sanitizeText(req.body.description, 2000);

      const [result] = await pool.query(
        `INSERT INTO documents
          (target_id, title, description, original_name, stored_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          targetId,
          title,
          description,
          sanitizeText(req.file.originalname, 255) || req.file.filename,
          req.file.filename,
          req.file.mimetype,
          req.file.size || 0
        ]
      );
      const [rows] = await pool.query(
        'SELECT id, target_id, title, description, original_name, mime_type, size_bytes, created_at FROM documents WHERE id = ?',
        [result.insertId]
      );
      res.status(201).json({ document: rows[0] });
    } catch (e) {
      console.error(e);
      if (req.file) fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: 'تعذر حفظ المستند' });
    }
  });
});

router.get('/:docId/download', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const docId = parseId(req.params.docId);
    if (!targetId || !docId) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [rows] = await pool.query(
      'SELECT * FROM documents WHERE id = ? AND target_id = ?',
      [docId, targetId]
    );
    if (!rows.length) return res.status(404).json({ error: 'المستند غير موجود' });
    const doc = rows[0];
    const filePath = path.join(process.cwd(), 'uploads', 'targets', String(targetId), doc.stored_name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'الملف غير موجود على القرص' });
    res.download(filePath, doc.original_name);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر تنزيل المستند' });
  }
});

router.delete('/:docId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const docId = parseId(req.params.docId);
    if (!targetId || !docId) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [rows] = await pool.query(
      'SELECT * FROM documents WHERE id = ? AND target_id = ?',
      [docId, targetId]
    );
    if (!rows.length) return res.status(404).json({ error: 'المستند غير موجود' });
    const doc = rows[0];
    await pool.query('DELETE FROM documents WHERE id = ?', [docId]);
    const filePath = path.join(process.cwd(), 'uploads', 'targets', String(targetId), doc.stored_name);
    fs.unlink(filePath, () => {});
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حذف المستند' });
  }
});

module.exports = router;
