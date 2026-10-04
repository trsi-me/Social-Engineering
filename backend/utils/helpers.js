function getDateParts(date) {
  if (date == null || date === '') return null;
  if (typeof date === 'string') {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      return {
        y: Number(m[1]),
        m: Number(m[2]),
        d: Number(m[3])
      };
    }
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return {
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    d: d.getDate()
  };
}

function formatDateTimeAr(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  let h = d.getHours();
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12;
  if (h === 0) h = 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}م ${h}:${m}${ampm}`;
}

function formatDateAr(date) {
  const p = getDateParts(date);
  if (!p) return '-';
  return `${p.y}/${p.m}/${p.d}م`;
}

function formatHijriAr(date) {
  const p = getDateParts(date);
  if (!p) return '-';
  try {
    const utc = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
    const fp = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC'
    }).formatToParts(utc);
    const y = Number(String(fp.find((x) => x.type === 'year')?.value || '').replace(/\D/g, ''));
    const m = Number(fp.find((x) => x.type === 'month')?.value);
    const d = Number(fp.find((x) => x.type === 'day')?.value);
    if (!y || !m || !d) return '-';
    return `${y}/${m}/${d}هـ`;
  } catch {
    return '-';
  }
}

function calcAgeYears(y, m, d, nowY, nowM, nowD) {
  let age = nowY - y;
  if (nowM < m || (nowM === m && nowD < d)) age -= 1;
  return age < 0 ? 0 : age;
}

function calcGregorianAge(date, now = new Date()) {
  const p = getDateParts(date);
  if (!p) return null;
  return calcAgeYears(p.y, p.m, p.d, now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function calcHijriAge(date, now = new Date()) {
  const p = getDateParts(date);
  if (!p) return null;
  try {
    const birthUtc = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
    const nowUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));
    const fmt = new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      timeZone: 'UTC'
    });
    const partsOf = (dt) => {
      const fp = fmt.formatToParts(dt);
      return {
        y: Number(String(fp.find((x) => x.type === 'year')?.value || '').replace(/\D/g, '')),
        m: Number(fp.find((x) => x.type === 'month')?.value),
        d: Number(fp.find((x) => x.type === 'day')?.value)
      };
    };
    const b = partsOf(birthUtc);
    const n = partsOf(nowUtc);
    if (!b.y || !n.y) return null;
    return calcAgeYears(b.y, b.m, b.d, n.y, n.m, n.d);
  } catch {
    return null;
  }
}

function formatBirthDualAr(date) {
  const g = formatDateAr(date);
  const h = formatHijriAr(date);
  if (g === '-') return '-';
  const gAge = calcGregorianAge(date);
  const hAge = calcHijriAge(date);
  const gPart = gAge == null ? g : `${g} (${gAge} سنة)`;
  if (h === '-') return gPart;
  const hPart = hAge == null ? h : `${h} (${hAge} سنة)`;
  return `${gPart} - ${hPart}`;
}

function dtArHtml(date, withTime = true) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '<span class="dt-ar"><span class="dt-ar__num">-</span></span>';
  let timeHtml = '';
  if (withTime) {
    let h = d.getHours();
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    timeHtml = `<span class="dt-ar__time"><span class="dt-ar__num">${h}:${m}</span><span class="dt-ar__mark">${ampm}</span></span>`;
  }
  const datePart = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  return `<span class="dt-ar"><span class="dt-ar__date"><span class="dt-ar__num">${datePart}</span><span class="dt-ar__mark">م</span></span>${timeHtml}</span>`;
}

function detectKuwaitTelecom(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  let local = digits;
  if (local.startsWith('965') && local.length >= 11) local = local.slice(-8);
  if (local.length !== 8) return null;
  if (local.startsWith('41')) return 'Virgin Mobile (على شبكة STC)';
  const first = local[0];
  if (first === '9') return 'Zain';
  if (first === '6') return 'Ooredoo';
  if (first === '5') return 'STC';
  return null;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeText(v, max = 500) {
  if (v == null) return null;
  const t = String(v).trim();
  if (!t) return null;
  return t.slice(0, max);
}

function parseId(v) {
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function isSafeHttpUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(String(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const STATUS_LABELS = { active: 'نشط', archived: 'مؤرشف' };
const NOTE_TYPE_LABELS = { note: 'ملاحظة', link: 'رابط', investigation: 'تحقيق' };

module.exports = {
  getDateParts,
  formatDateTimeAr,
  formatDateAr,
  formatHijriAr,
  formatBirthDualAr,
  detectKuwaitTelecom,
  dtArHtml,
  escapeHtml,
  sanitizeText,
  parseId,
  isSafeHttpUrl,
  STATUS_LABELS,
  NOTE_TYPE_LABELS
};
