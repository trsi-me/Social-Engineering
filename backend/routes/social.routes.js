const express = require('express');
const pool = require('../db');
const { sanitizeText, parseId, isSafeHttpUrl } = require('../utils/helpers');

const router = express.Router({ mergeParams: true });

async function assertTarget(targetId) {
  const [rows] = await pool.query(
    'SELECT id FROM targets WHERE id = ? AND deleted_at IS NULL',
    [targetId]
  );
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });
    const [rows] = await pool.query(
      'SELECT * FROM social_accounts WHERE target_id = ? ORDER BY created_at DESC',
      [targetId]
    );
    res.json({ social: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب الحسابات' });
  }
});

router.post('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });

    const body = req.body || {};
    const platform = sanitizeText(body.platform, 80);
    if (!platform) return res.status(400).json({ error: 'المنصة مطلوبة' });
    const profileUrl = sanitizeText(body.profile_url, 500);
    if (profileUrl && !isSafeHttpUrl(profileUrl)) {
      return res.status(400).json({ error: 'رابط غير صالح' });
    }

    const [result] = await pool.query(
      `INSERT INTO social_accounts (target_id, platform, username, profile_url, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [
        targetId,
        platform,
        sanitizeText(body.username, 150),
        profileUrl,
        sanitizeText(body.notes, 2000)
      ]
    );
    const [rows] = await pool.query('SELECT * FROM social_accounts WHERE id = ?', [result.insertId]);
    res.status(201).json({ account: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر إضافة الحساب' });
  }
});

router.put('/:accountId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const accountId = parseId(req.params.accountId);
    if (!targetId || !accountId) return res.status(400).json({ error: 'معرّف غير صالح' });

    const body = req.body || {};
    const platform = sanitizeText(body.platform, 80);
    if (!platform) return res.status(400).json({ error: 'المنصة مطلوبة' });
    const profileUrl = sanitizeText(body.profile_url, 500);
    if (profileUrl && !isSafeHttpUrl(profileUrl)) {
      return res.status(400).json({ error: 'رابط غير صالح' });
    }

    const [result] = await pool.query(
      `UPDATE social_accounts SET platform = ?, username = ?, profile_url = ?, notes = ?
       WHERE id = ? AND target_id = ?`,
      [
        platform,
        sanitizeText(body.username, 150),
        profileUrl,
        sanitizeText(body.notes, 2000),
        accountId,
        targetId
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الحساب غير موجود' });
    const [rows] = await pool.query('SELECT * FROM social_accounts WHERE id = ?', [accountId]);
    res.json({ account: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر تحديث الحساب' });
  }
});

router.delete('/:accountId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const accountId = parseId(req.params.accountId);
    if (!targetId || !accountId) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [result] = await pool.query(
      'DELETE FROM social_accounts WHERE id = ? AND target_id = ?',
      [accountId, targetId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'الحساب غير موجود' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حذف الحساب' });
  }
});

module.exports = router;
