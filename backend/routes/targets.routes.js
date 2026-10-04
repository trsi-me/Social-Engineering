const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const {
  sanitizeText,
  parseId,
  isSafeHttpUrl,
  detectKuwaitTelecom,
  STATUS_LABELS
} = require('../utils/helpers');

const router = express.Router();

const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const photoUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const id = parseId(req.params.id);
      if (!id) return cb(new Error('معرّف غير صالح'));
      const dir = path.join(process.cwd(), 'uploads', 'targets', String(id));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = (path.extname(file.originalname || '') || '.jpg').toLowerCase().slice(0, 10);
      const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
      cb(null, `profile${safeExt === '.jpeg' ? '.jpg' : safeExt}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    if (!PHOTO_MIME.has(file.mimetype)) return cb(new Error('الصورة يجب أن تكون JPG أو PNG أو WebP'));
    cb(null, true);
  }
});

function mapTarget(row) {
  if (!row) return null;
  let photo_url = null;
  if (row.photo_path) {
    const safe = String(row.photo_path).replace(/\\/g, '/').replace(/^\/+/, '');
    if (safe.startsWith('targets/') && !safe.includes('..')) {
      photo_url = '/uploads/' + safe;
    }
  }
  return {
    ...row,
    photo_url,
    status_label: STATUS_LABELS[row.status] || row.status
  };
}

function parseOptionalDate(v) {
  const dob = sanitizeText(v, 20);
  return dob && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : null;
}

function collectTargetFields(body) {
  const email = sanitizeText(body.email, 190);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error('البريد غير صالح');
    err.status = 400;
    throw err;
  }
  const mapsUrl = sanitizeText(body.maps_url, 500);
  if (mapsUrl && !isSafeHttpUrl(mapsUrl)) {
    const err = new Error('رابط الخريطة غير صالح');
    err.status = 400;
    throw err;
  }
  const fullName = sanitizeText(body.full_name, 200);
  if (!fullName) {
    const err = new Error('الاسم الكامل مطلوب');
    err.status = 400;
    throw err;
  }
  const phone = sanitizeText(body.phone, 40);
  let telecom = sanitizeText(body.telecom_company, 100);
  if (!telecom && phone) {
    telecom = detectKuwaitTelecom(phone);
  }
  return {
    full_name: fullName,
    english_name: sanitizeText(body.english_name, 200),
    national_id: sanitizeText(body.national_id, 32),
    phone,
    telecom_company: telecom,
    phone_model: sanitizeText(body.phone_model, 150),
    email,
    address: sanitizeText(body.address, 500),
    maps_url: mapsUrl,
    date_of_birth: parseOptionalDate(body.date_of_birth),
    nationality: sanitizeText(body.nationality, 100),
    gender: sanitizeText(body.gender, 40),
    blood_type: sanitizeText(body.blood_type, 20),
    civil_id_expiry: parseOptionalDate(body.civil_id_expiry),
    occupation: sanitizeText(body.occupation, 150),
    employer: sanitizeText(body.employer, 200),
    status: body.status === 'archived' ? 'archived' : 'active',
    summary: sanitizeText(body.summary, 5000),
    companies_text: sanitizeText(body.companies_text, 8000),
    travels_text: sanitizeText(body.travels_text, 8000),
    academic_text: sanitizeText(body.academic_text, 8000),
    career_text: sanitizeText(body.career_text, 8000),
    research_text: sanitizeText(body.research_text, 8000),
    assessment_text: sanitizeText(body.assessment_text, 8000)
  };
}

router.get('/', async (req, res) => {
  try {
    const q = sanitizeText(req.query.q, 100);
    const status = req.query.status === 'archived' || req.query.status === 'active'
      ? req.query.status
      : null;
    const params = [];
    let sql = 'SELECT * FROM targets WHERE deleted_at IS NULL';
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (q) {
      sql += ' AND (full_name LIKE ? OR national_id LIKE ? OR phone LIKE ? OR email LIKE ? OR english_name LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }
    sql += ' ORDER BY updated_at DESC, id DESC';
    const [rows] = await pool.query(sql, params);
    res.json({ targets: rows.map(mapTarget) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب الملفات' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [rows] = await pool.query(
      'SELECT * FROM targets WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'الملف غير موجود' });
    res.json({ target: mapTarget(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب الملف' });
  }
});

router.post('/', async (req, res) => {
  try {
    const f = collectTargetFields(req.body || {});
    const [result] = await pool.query(
      `INSERT INTO targets
        (full_name, english_name, national_id, phone, telecom_company, phone_model, email, address, maps_url, date_of_birth,
         nationality, gender, blood_type, civil_id_expiry, occupation, employer, status, summary,
         companies_text, travels_text, academic_text, career_text, research_text, assessment_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.full_name, f.english_name, f.national_id, f.phone, f.telecom_company, f.phone_model,
        f.email, f.address, f.maps_url,
        f.date_of_birth, f.nationality, f.gender, f.blood_type, f.civil_id_expiry,
        f.occupation, f.employer, f.status, f.summary,
        f.companies_text, f.travels_text, f.academic_text, f.career_text, f.research_text, f.assessment_text
      ]
    );
    const [rows] = await pool.query('SELECT * FROM targets WHERE id = ?', [result.insertId]);
    res.status(201).json({ target: mapTarget(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'تعذر إنشاء الملف' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [existing] = await pool.query(
      'SELECT id FROM targets WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (!existing.length) return res.status(404).json({ error: 'الملف غير موجود' });

    const f = collectTargetFields(req.body || {});
    await pool.query(
      `UPDATE targets SET
        full_name = ?, english_name = ?, national_id = ?, phone = ?, telecom_company = ?, phone_model = ?,
        email = ?, address = ?, maps_url = ?,
        date_of_birth = ?, nationality = ?, gender = ?, blood_type = ?, civil_id_expiry = ?,
        occupation = ?, employer = ?, status = ?, summary = ?,
        companies_text = ?, travels_text = ?, academic_text = ?, career_text = ?, research_text = ?, assessment_text = ?
       WHERE id = ?`,
      [
        f.full_name, f.english_name, f.national_id, f.phone, f.telecom_company, f.phone_model,
        f.email, f.address, f.maps_url,
        f.date_of_birth, f.nationality, f.gender, f.blood_type, f.civil_id_expiry,
        f.occupation, f.employer, f.status, f.summary,
        f.companies_text, f.travels_text, f.academic_text, f.career_text, f.research_text, f.assessment_text,
        id
      ]
    );
    const [rows] = await pool.query('SELECT * FROM targets WHERE id = ?', [id]);
    res.json({ target: mapTarget(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'تعذر تحديث الملف' });
  }
});

router.post('/:id/photo', (req, res) => {
  photoUpload.single('photo')(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message || 'تعذر رفع الصورة' });
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ error: 'معرّف غير صالح' });
      if (!req.file) return res.status(400).json({ error: 'اختر صورة' });
      const [existing] = await pool.query(
        'SELECT id FROM targets WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      if (!existing.length) return res.status(404).json({ error: 'الملف غير موجود' });
      const photoPath = `targets/${id}/${req.file.filename}`;
      await pool.query('UPDATE targets SET photo_path = ? WHERE id = ?', [photoPath, id]);
      const [rows] = await pool.query('SELECT * FROM targets WHERE id = ?', [id]);
      res.json({ target: mapTarget(rows[0]) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'تعذر حفظ الصورة' });
    }
  });
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [result] = await pool.query(
      'UPDATE targets SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL',
      [id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الملف غير موجود' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حذف الملف' });
  }
});

module.exports = router;
