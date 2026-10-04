const express = require('express');
const pool = require('../db');
const { sanitizeText, parseId } = require('../utils/helpers');

const router = express.Router({ mergeParams: true });

const BRANDS = new Set([
  'visa', 'mastercard', 'mada', 'amex', 'discover', 'unionpay', 'other', 'unknown'
]);

const BRAND_LABELS = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  mada: 'مدى',
  amex: 'American Express',
  discover: 'Discover',
  unionpay: 'UnionPay',
  other: 'أخرى',
  unknown: 'غير محدد'
};

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '');
}

function detectBrand(num) {
  const n = digitsOnly(num);
  if (!n) return 'unknown';
  if (/^4\d{12,18}$/.test(n)) return 'visa';
  if (/^(5[1-5]\d{14}|2(2[2-9]\d{12}|[3-6]\d{13}|7[01]\d{12}|720\d{12}))$/.test(n)) return 'mastercard';
  if (/^3[47]\d{13}$/.test(n)) return 'amex';
  if (/^6(?:011|5\d{2})\d{12}$/.test(n)) return 'discover';
  if (/^62\d{14,17}$/.test(n)) return 'unionpay';
  if (/^(4|5)\d{15}$/.test(n)) return 'mada';
  return 'other';
}

function luhnOk(num) {
  const n = digitsOnly(num);
  if (n.length < 12 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function normalizeCvv(v) {
  const d = digitsOnly(v);
  if (!d) return null;
  if (d.length < 3 || d.length > 4) return false;
  return d;
}

function mapCard(row) {
  if (!row) return null;
  return {
    ...row,
    brand_label: BRAND_LABELS[row.brand] || row.brand,
    masked_number: row.last_four ? `**** **** **** ${row.last_four}` : '-',
    exp_label: row.exp_month && row.exp_year
      ? `${String(row.exp_month).padStart(2, '0')}/${String(row.exp_year).slice(-2)}`
      : null
  };
}

function parseExpiry(body) {
  let expMonth = body.exp_month != null && body.exp_month !== ''
    ? Number.parseInt(body.exp_month, 10)
    : null;
  let expYear = body.exp_year != null && body.exp_year !== ''
    ? Number.parseInt(body.exp_year, 10)
    : null;

  if (body.exp && !expMonth) {
    const m = String(body.exp).match(/^(\d{1,2})\s*[\/\-]\s*(\d{2,4})$/);
    if (m) {
      expMonth = Number.parseInt(m[1], 10);
      expYear = Number.parseInt(m[2], 10);
      if (expYear < 100) expYear += 2000;
    }
  }
  return { expMonth, expYear };
}

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
      `SELECT id, target_id, cardholder_name, brand, card_number, last_four,
              exp_month, exp_year, cvv, bank_name, notes, created_at
       FROM bank_cards WHERE target_id = ? ORDER BY created_at DESC`,
      [targetId]
    );
    res.json({ cards: rows.map(mapCard) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر جلب البطاقات' });
  }
});

router.post('/', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    if (!targetId) return res.status(400).json({ error: 'معرّف غير صالح' });
    if (!(await assertTarget(targetId))) return res.status(404).json({ error: 'الملف غير موجود' });

    const body = req.body || {};
    const cardNumber = digitsOnly(body.card_number);
    if (cardNumber.length < 12 || cardNumber.length > 19) {
      return res.status(400).json({ error: 'رقم البطاقة غير صالح' });
    }
    if (!luhnOk(cardNumber)) {
      return res.status(400).json({ error: 'رقم البطاقة فشل التحقق' });
    }

    let brand = sanitizeText(body.brand, 40) || 'unknown';
    brand = brand.toLowerCase();
    if (!BRANDS.has(brand) || brand === 'unknown') {
      brand = detectBrand(cardNumber);
    }

    const cvv = normalizeCvv(body.cvv);
    if (cvv === false) {
      return res.status(400).json({ error: 'CVV غير صالح (3 أو 4 أرقام)' });
    }

    const { expMonth, expYear } = parseExpiry(body);
    if (expMonth != null && (expMonth < 1 || expMonth > 12)) {
      return res.status(400).json({ error: 'شهر الانتهاء غير صالح' });
    }
    if (expYear != null && (expYear < 2000 || expYear > 2100)) {
      return res.status(400).json({ error: 'سنة الانتهاء غير صالحة' });
    }

    const lastFour = cardNumber.slice(-4);
    const [result] = await pool.query(
      `INSERT INTO bank_cards
        (target_id, cardholder_name, brand, card_number, last_four, exp_month, exp_year, cvv, bank_name, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetId,
        sanitizeText(body.cardholder_name, 200),
        brand,
        cardNumber,
        lastFour,
        expMonth,
        expYear,
        cvv,
        sanitizeText(body.bank_name, 150),
        sanitizeText(body.notes, 2000)
      ]
    );
    const [rows] = await pool.query('SELECT * FROM bank_cards WHERE id = ?', [result.insertId]);
    res.status(201).json({ card: mapCard(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حفظ البطاقة' });
  }
});

router.put('/:cardId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const cardId = parseId(req.params.cardId);
    if (!targetId || !cardId) return res.status(400).json({ error: 'معرّف غير صالح' });

    const body = req.body || {};
    const cardNumber = digitsOnly(body.card_number);
    if (cardNumber.length < 12 || cardNumber.length > 19) {
      return res.status(400).json({ error: 'رقم البطاقة غير صالح' });
    }
    if (!luhnOk(cardNumber)) {
      return res.status(400).json({ error: 'رقم البطاقة فشل التحقق' });
    }

    let brand = sanitizeText(body.brand, 40) || 'unknown';
    brand = brand.toLowerCase();
    if (!BRANDS.has(brand) || brand === 'unknown') {
      brand = detectBrand(cardNumber);
    }

    const cvv = normalizeCvv(body.cvv);
    if (cvv === false) {
      return res.status(400).json({ error: 'CVV غير صالح (3 أو 4 أرقام)' });
    }

    const { expMonth, expYear } = parseExpiry(body);
    if (expMonth != null && (expMonth < 1 || expMonth > 12)) {
      return res.status(400).json({ error: 'شهر الانتهاء غير صالح' });
    }
    if (expYear != null && (expYear < 2000 || expYear > 2100)) {
      return res.status(400).json({ error: 'سنة الانتهاء غير صالحة' });
    }

    const lastFour = cardNumber.slice(-4);
    const [result] = await pool.query(
      `UPDATE bank_cards SET
        cardholder_name = ?, brand = ?, card_number = ?, last_four = ?,
        exp_month = ?, exp_year = ?, cvv = ?, bank_name = ?, notes = ?
       WHERE id = ? AND target_id = ?`,
      [
        sanitizeText(body.cardholder_name, 200),
        brand,
        cardNumber,
        lastFour,
        expMonth,
        expYear,
        cvv,
        sanitizeText(body.bank_name, 150),
        sanitizeText(body.notes, 2000),
        cardId,
        targetId
      ]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'البطاقة غير موجودة' });
    const [rows] = await pool.query('SELECT * FROM bank_cards WHERE id = ?', [cardId]);
    res.json({ card: mapCard(rows[0]) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر تحديث البطاقة' });
  }
});

router.delete('/:cardId', async (req, res) => {
  try {
    const targetId = parseId(req.params.targetId);
    const cardId = parseId(req.params.cardId);
    if (!targetId || !cardId) return res.status(400).json({ error: 'معرّف غير صالح' });
    const [result] = await pool.query(
      'DELETE FROM bank_cards WHERE id = ? AND target_id = ?',
      [cardId, targetId]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'البطاقة غير موجودة' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'تعذر حذف البطاقة' });
  }
});

module.exports = router;
