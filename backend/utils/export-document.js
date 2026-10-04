const fs = require('fs');
const os = require('os');
const path = require('path');
const { formatDateTimeAr, formatDateAr, formatBirthDualAr, escapeHtml } = require('./helpers');

const APP_TITLE = 'مختبر الهندسة الاجتماعية';
const EXPORT_ISSUED = 'وثيقة مُصدَّرة من نظام ملفات الأهداف';

function escapePreHtml(s) {
  return escapeHtml(s).replace(/\r\n/g, '\n');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fontsCssDataUri() {
  const dir = path.join(process.cwd(), 'assets', 'fonts');
  const regular = path.join(dir, 'IBMPlexSansArabic-Regular.ttf');
  const bold = path.join(dir, 'IBMPlexSansArabic-Bold.ttf');
  if (!fs.existsSync(regular)) return '';
  const regB64 = fs.readFileSync(regular).toString('base64');
  let css = `@font-face{font-family:'IBM Plex Sans Arabic';src:url(data:font/ttf;base64,${regB64}) format('truetype');font-weight:400;font-style:normal}`;
  if (fs.existsSync(bold)) {
    const boldB64 = fs.readFileSync(bold).toString('base64');
    css += `@font-face{font-family:'IBM Plex Sans Arabic';src:url(data:font/ttf;base64,${boldB64}) format('truetype');font-weight:700;font-style:normal}`;
  }
  return css;
}

function projectCacheDir(name) {
  const dir = path.join(process.cwd(), '.cache', name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function puppeteerLaunchArgs() {
  const crashDir = projectCacheDir('crashpad');
  return [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--no-first-run',
    '--no-zygote',
    '--disable-crash-reporter',
    '--disable-breakpad',
    `--crash-dumps-dir=${crashDir}`
  ];
}

async function resolveChromeExecutable() {
  try {
    const puppeteer = require('puppeteer');
    const exe = await puppeteer.executablePath();
    if (exe && fs.existsSync(exe)) return exe;
  } catch (_) { /* ignore */ }
  return null;
}

async function launchBrowserForPdf() {
  const executablePath = await resolveChromeExecutable();
  if (!executablePath) {
    throw new Error('Chrome غير مثبت — نفّذ npm install ثم أعد المحاولة');
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'se-chrome-'));
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    userDataDir,
    args: puppeteerLaunchArgs()
  });
  browser._seProfileDir = userDataDir;
  return browser;
}

async function closeBrowserForPdf(browser) {
  if (!browser) return;
  const profile = browser._seProfileDir;
  try { await browser.close(); } catch (_) { /* ignore */ }
  if (profile) {
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  }
}

function isValidPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length > 5 && buf.slice(0, 5).toString() === '%PDF-';
}

async function htmlToPdfBuffer(html) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    let browser;
    try {
      browser = await launchBrowserForPdf();
      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
        await page.setContent(html, { waitUntil: 'load', timeout: 45000 });
        await page.evaluate(async () => {
          if (document.documentElement) document.documentElement.lang = 'ar';
          if (document.body) document.body.dir = 'rtl';
          if (document.fonts && document.fonts.ready) await document.fonts.ready;
        });
        await sleep(500);
        await page.emulateMediaType('print');
        return await page.pdf({
          format: 'A4',
          printBackground: true,
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: '<div style="width:100%;font-size:10px;text-align:center;color:#64748b;font-family:Tahoma,Arial,sans-serif;"><span class="pageNumber"></span></div>',
          margin: { top: '14mm', bottom: '18mm', left: '12mm', right: '12mm' }
        });
      } finally {
        try { await page.close(); } catch (_) { /* ignore */ }
      }
    } catch (e) {
      lastErr = e;
      await sleep(600 * (i + 1));
    } finally {
      await closeBrowserForPdf(browser);
    }
  }
  throw lastErr || new Error('فشل إنشاء PDF');
}

function formatCell(v) {
  if (v == null || v === '') return '-';
  if (v instanceof Date) return formatDateTimeAr(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const hasTime = v.includes('T') || v.includes(' ');
    return hasTime ? formatDateTimeAr(v) : formatDateAr(v);
  }
  return String(v);
}

function exportStyles() {
  return `
    ${fontsCssDataUri()}
    * { box-sizing: border-box }
    body {
      margin: 0;
      padding: 0;
      font-family: 'IBM Plex Sans Arabic', Tahoma, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      direction: rtl
    }
    .doc { padding: 8px 4px }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 2px solid #0d9488
    }
    .head-text { flex: 1; min-width: 0 }
    .head h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700 }
    .head p { margin: 0; color: #64748b; font-size: 13px }
    .head-photo {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border: 2px solid #0d9488;
      border-radius: 8px;
      flex: 0 0 auto
    }
    .meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
      margin-bottom: 18px
    }
    .meta .item {
      padding: 8px 10px;
      background: #f1f5f9;
      border-radius: 8px
    }
    .meta .label { display: block; font-size: 11px; color: #64748b; margin-bottom: 2px }
    .meta .value { font-size: 13px; font-weight: 600 }
    h2 {
      margin: 20px 0 8px;
      font-size: 15px;
      color: #0f766e;
      border-bottom: 1px solid #ccfbf1;
      padding-bottom: 4px
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 8px
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 7px 8px;
      text-align: right;
      vertical-align: top
    }
    th { background: #0f172a; color: #f8fafc; font-weight: 700 }
    tr:nth-child(even) td { background: #f8fafc }
    td.pre {
      white-space: pre-wrap;
      unicode-bidi: plaintext;
      word-break: break-word
    }
    .ltr {
      display: inline-block;
      direction: ltr;
      unicode-bidi: isolate
    }
    .summary {
      margin: 0 0 14px;
      padding: 10px 12px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      unicode-bidi: plaintext
    }
    table.profile-table th.col-key,
    table.profile-table td.col-key {
      width: 32%;
      font-weight: 700;
      background: #f1f5f9;
      white-space: nowrap
    }
    table.profile-table td.col-val {
      width: 68%;
      unicode-bidi: plaintext;
      white-space: pre-wrap;
      word-break: break-word
    }
    .footer {
      margin-top: 28px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 11px
    }
  `;
}

function parseNoteFields(body) {
  const map = {};
  String(body || '').split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf(':');
    if (idx < 1) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key && val) map[key] = val;
  });
  return map;
}

function findNote(notes, titlePart) {
  return (notes || []).find((n) => String(n.title || '').includes(titlePart)) || null;
}

function buildPersonSummaryRows(bundle) {
  const t = bundle.target;
  const status = t.status === 'archived' ? 'مؤرشف' : 'نشط';
  const idNote = findNote(bundle.notes, 'الهوية');
  const idFields = parseNoteFields(idNote?.body);

  const accounts = (bundle.social || []).map((s) => {
    const rawUser = String(s.username || '').trim();
    const user = rawUser
      ? (rawUser.startsWith('@') ? rawUser : `@${rawUser}`)
      : '-';
    return `${s.platform || '-'} : (${user})`;
  }).filter(Boolean).join('\n') || '-';

  const cards = (bundle.cards || []).map((c) => {
    const brand = c.brand || 'unknown';
    const exp = c.exp_month && c.exp_year
      ? `${String(c.exp_month).padStart(2, '0')}-${String(c.exp_year).slice(-2)}`
      : '';
    const num = String(c.card_number || '').replace(/\D/g, '');
    const spaced = num
      ? num.replace(/(\d{4})(?=\d)/g, '$1 ').trim()
      : (c.last_four ? c.last_four : '');
    return [
      c.cardholder_name,
      brand,
      spaced,
      exp,
      c.cvv ? `CVV ${c.cvv}` : '',
      c.bank_name
    ].filter(Boolean).join(' - ');
  }).filter(Boolean).join('\n') || '-';

  const docs = (bundle.documents || []).map((d) => d.title).filter(Boolean).join(' | ') || '-';

  const arName = t.full_name || idFields['الاسم الكامل'] || '-';
  const enName = t.english_name || idFields['الاسم بالإنجليزية'] || '';
  const nameDisplay = enName ? `${arName} (${enName})` : arName;

  const rows = [
    ['الاسم الكامل', nameDisplay],
    ['رقم الهوية', t.national_id || idFields['الرقم المدني'] || '-'],
    ['تاريخ انتهاء البطاقة المدنية', t.civil_id_expiry ? formatDateAr(t.civil_id_expiry) : (idFields['تاريخ انتهاء البطاقة'] || '-')],
    ['الجنسية', t.nationality || idFields['الجنسية'] || '-'],
    ['الجنس', t.gender || idFields['الجنس'] || '-'],
    ['تاريخ الميلاد', t.date_of_birth ? formatBirthDualAr(t.date_of_birth) : (idFields['تاريخ الميلاد'] || '-')],
    ['فصيلة الدم', t.blood_type || idFields['فصيلة الدم'] || '-'],
    ['الهاتف', t.phone || idFields['الهاتف'] || '-'],
    ['شركة الاتصالات', t.telecom_company || '-'],
    ['نوع الجوال والنظام', t.phone_model || '-'],
    ['البريد الالكتروني', t.email || '-'],
    ['العنوان', t.address || idFields['العنوان'] || '-'],
    ['رابط Google Maps', t.maps_url || '-'],
    ['المهنة', t.occupation || '-'],
    ['جهة العمل', t.employer || '-'],
    ['الشركات', t.companies_text || '-'],
    ['سجل السفريات', t.travels_text || '-'],
    ['حسابات التواصل', accounts],
    ['البطاقات البنكية', cards],
    ['المسار الأكاديمي', t.academic_text || '-'],
    ['الخبرات المهنية', t.career_text || '-'],
    ['الإنتاج البحثي', t.research_text || '-'],
    ['المستندات', docs],
    ['التقييم والمخاطر', t.assessment_text || '-'],
    ['الحالة', status],
    ['ملخص الملف', t.summary || '-'],
    ['أُنشئ في', formatDateTimeAr(t.created_at)],
    ['آخر تحديث', formatDateTimeAr(t.updated_at)]
  ];

  return rows.filter(([, v]) => v != null && String(v).trim() !== '');
}

function targetPhotoDataUri(target) {
  if (!target?.photo_path) return '';
  const safe = String(target.photo_path).replace(/\\/g, '/').replace(/^\/+/, '');
  if (!safe.startsWith('targets/') || safe.includes('..')) return '';
  const full = path.join(process.cwd(), 'uploads', ...safe.split('/'));
  if (!fs.existsSync(full)) return '';
  const ext = path.extname(full).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(full).toString('base64')}`;
}

function buildTargetReportHtml(bundle) {
  const t = bundle.target;
  const summaryRows = buildPersonSummaryRows(bundle);
  const summaryHtml = summaryRows.map(([label, value]) => `
    <tr>
      <td class="col-key">${escapeHtml(label)}</td>
      <td class="col-val"><span class="ltr-safe">${escapePreHtml(value)}</span></td>
    </tr>
  `).join('');
  const arName = t.full_name || '-';
  const enName = t.english_name || '';
  const nameDisplay = enName ? `${arName} (${enName})` : arName;
  const photoData = targetPhotoDataUri(t);
  const photoHtml = photoData
    ? `<img class="head-photo" src="${photoData}" alt="الصورة الشخصية">`
    : '';

  const docsRows = (bundle.documents || []).map((d) => `
    <tr>
      <td>${escapeHtml(d.title)}</td>
      <td>${escapeHtml(d.description || '-')}</td>
      <td>${escapeHtml(d.original_name)}</td>
      <td>${escapeHtml(formatDateTimeAr(d.created_at))}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">لا توجد مستندات</td></tr>';

  const detailNotes = (bundle.notes || []).filter((n) => {
    const title = String(n.title || '');
    return !(
      title.includes('الهوية')
      || title.includes('الشركات')
      || title.includes('الأكاديمي')
      || title.includes('الخبرات')
      || title.includes('البحثي')
      || title.includes('تقييم')
      || title.includes('الملخص التنفيذي')
    );
  });

  const notesRows = detailNotes.map((n) => {
    const typeLabel = n.note_type === 'link' ? 'رابط' : n.note_type === 'investigation' ? 'تحقيق' : 'ملاحظة';
    return `<tr>
      <td>${escapeHtml(typeLabel)}</td>
      <td>${escapeHtml(n.title)}</td>
      <td class="pre">${escapePreHtml(n.body || '-')}</td>
      <td class="pre"><span class="ltr">${escapeHtml(n.url || '-')}</span></td>
      <td>${escapeHtml(formatDateTimeAr(n.created_at))}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5">لا توجد ملاحظات إضافية</td></tr>';

  const socialRows = (bundle.social || []).map((s) => `
    <tr>
      <td>${escapeHtml(s.platform)}</td>
      <td class="pre"><span class="ltr">${escapeHtml(s.username || '-')}</span></td>
      <td class="pre"><span class="ltr">${escapeHtml(s.profile_url || '-')}</span></td>
      <td class="pre">${escapePreHtml(s.notes || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">لا توجد حسابات</td></tr>';

  const timelineRows = (bundle.timeline || []).map((e) => `
    <tr>
      <td>${escapeHtml(formatDateTimeAr(e.event_at))}</td>
      <td>${escapeHtml(e.title)}</td>
      <td class="pre">${escapePreHtml(e.description || '-')}</td>
      <td>${escapeHtml(e.source || '-')}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">لا توجد أحداث</td></tr>';

  const brandLabels = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    mada: 'مدى',
    amex: 'American Express',
    discover: 'Discover',
    unionpay: 'UnionPay',
    other: 'أخرى',
    unknown: 'غير محدد'
  };
  const cardsRows = (bundle.cards || []).map((c) => {
    const exp = c.exp_month && c.exp_year
      ? `${String(c.exp_month).padStart(2, '0')}/${String(c.exp_year).slice(-2)}`
      : '-';
    return `<tr>
      <td>${escapeHtml(c.cardholder_name || '-')}</td>
      <td><span class="ltr">${escapeHtml(brandLabels[c.brand] || c.brand || '-')}</span></td>
      <td class="pre"><span class="ltr">${escapeHtml((() => {
        const n = String(c.card_number || '').replace(/\D/g, '');
        return n ? n.replace(/(\d{4})(?=\d)/g, '$1 ').trim() : (c.last_four || '----');
      })())}</span></td>
      <td><span class="ltr">${escapeHtml(exp)}</span></td>
      <td><span class="ltr">${escapeHtml(c.cvv || '-')}</span></td>
      <td>${escapeHtml(c.bank_name || '-')}</td>
      <td class="pre">${escapePreHtml(c.notes || '-')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="7">لا توجد بطاقات</td></tr>';

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(`ملف الهدف - ${t.full_name}`)}</title>
  <style>${exportStyles()}
    .ltr-safe { unicode-bidi: plaintext; white-space: pre-wrap }
  </style>
</head>
<body>
  <div class="doc">
    <header class="head">
      <div class="head-text">
        <h1>ملف الهدف: ${escapeHtml(nameDisplay)}</h1>
        <p>${escapeHtml(APP_TITLE)}</p>
      </div>
      ${photoHtml}
    </header>
    <h2>ملخص شامل للشخصية</h2>
    <table class="profile-table">
      <thead><tr><th class="col-key">العنصر</th><th>البيانات</th></tr></thead>
      <tbody>${summaryHtml}</tbody>
    </table>
    <h2>المستندات</h2>
    <table>
      <thead><tr><th>العنوان</th><th>الوصف</th><th>الملف</th><th>التاريخ</th></tr></thead>
      <tbody>${docsRows}</tbody>
    </table>
    <h2>الملاحظات والتحقيقات</h2>
    <table>
      <thead><tr><th>النوع</th><th>العنوان</th><th>المحتوى</th><th>الرابط</th><th>التاريخ</th></tr></thead>
      <tbody>${notesRows}</tbody>
    </table>
    <h2>حسابات التواصل</h2>
    <table>
      <thead><tr><th>المنصة</th><th>اسم المستخدم</th><th>الرابط</th><th>ملاحظات</th></tr></thead>
      <tbody>${socialRows}</tbody>
    </table>
    <h2>البطاقات البنكية</h2>
    <table>
      <thead><tr><th>الحامل</th><th>النوع</th><th>الرقم</th><th>الانتهاء</th><th>CVV</th><th>البنك</th><th>ملاحظات</th></tr></thead>
      <tbody>${cardsRows}</tbody>
    </table>
    <h2>السجل الزمني</h2>
    <table>
      <thead><tr><th>الوقت</th><th>الحدث</th><th>التفاصيل</th><th>المصدر</th></tr></thead>
      <tbody>${timelineRows}</tbody>
    </table>
    <div class="footer">
      <div>${escapeHtml(EXPORT_ISSUED)}</div>
      <div>${escapeHtml(formatDateTimeAr(new Date()))}</div>
    </div>
  </div>
</body>
</html>`;
}

function buildListExportData(targets) {
  return {
    title: 'قائمة ملفات الأهداف',
    headers: ['الرقم', 'الاسم', 'رقم الهوية', 'الهاتف', 'البريد الالكتروني', 'الحالة', 'تاريخ الإنشاء'],
    rows: targets.map((t) => ({
      id: t.id,
      full_name: t.full_name,
      national_id: t.national_id || '-',
      phone: t.phone || '-',
      email: t.email || '-',
      status: t.status === 'archived' ? 'مؤرشف' : 'نشط',
      created_at: formatDateTimeAr(t.created_at)
    }))
  };
}

function buildListHtml(data) {
  const rows = data.rows.map((row) => {
    const cells = Object.values(row).map((c) => `<td>${escapeHtml(formatCell(c))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.title)}</title>
  <style>${exportStyles()}</style>
</head>
<body>
  <div class="doc">
    <header class="head">
      <div>
        <h1>${escapeHtml(data.title)}</h1>
        <p>${escapeHtml(APP_TITLE)}</p>
      </div>
    </header>
    <table>
      <thead><tr>${data.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">
      <div>${escapeHtml(EXPORT_ISSUED)}</div>
      <div>${escapeHtml(formatDateTimeAr(new Date()))}</div>
    </div>
  </div>
</body>
</html>`;
}

function sendPdfBuffer(res, buffer, filename) {
  const pdf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (!isValidPdfBuffer(pdf)) throw new Error('تعذر إنشاء ملف PDF صالح');
  const safe = String(filename || 'export').replace(/[^\w\-]+/g, '_') || 'export';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(pdf.length));
  res.setHeader('Content-Disposition', `attachment; filename="${safe}.pdf"`);
  res.setHeader('Cache-Control', 'no-store');
  res.end(pdf);
}

function exportCsv(res, filename, data) {
  const lines = [data.title, APP_TITLE, '', data.headers.join(',')];
  data.rows.forEach((row) => {
    lines.push(Object.values(row).map((v) => `"${String(formatCell(v)).replace(/"/g, '""')}"`).join(','));
  });
  lines.push('', EXPORT_ISSUED, formatDateTimeAr(new Date()));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send('\uFEFF' + lines.join('\n'));
}

function exportTxt(res, filename, data) {
  const lines = [data.title, APP_TITLE, '', data.headers.join('\t')];
  data.rows.forEach((row) => {
    lines.push(Object.values(row).map((v) => formatCell(v)).join('\t'));
  });
  lines.push('', EXPORT_ISSUED, formatDateTimeAr(new Date()));
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.txt"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send('\uFEFF' + lines.join('\n'));
}

function exportHtmlFile(res, filename, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.html"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send('\uFEFF' + html);
}

async function exportXlsx(res, filename, data) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(data.title || filename);
  ws.addRow([data.title]).font = { bold: true, size: 14, name: 'IBM Plex Sans Arabic' };
  ws.addRow([APP_TITLE]);
  ws.addRow([]);
  const header = ws.addRow(data.headers);
  header.font = { bold: true, color: { argb: 'FFF8FAFC' }, name: 'IBM Plex Sans Arabic' };
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    c.alignment = { horizontal: 'right' };
  });
  data.rows.forEach((row, i) => {
    const r = ws.addRow(Object.values(row).map(formatCell));
    r.alignment = { horizontal: 'right' };
    if (i % 2 === 1) {
      r.eachCell((c) => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });
  ws.addRow([]);
  ws.addRow([EXPORT_ISSUED]);
  ws.addRow([formatDateTimeAr(new Date())]);
  ws.views = [{ rightToLeft: true }];
  data.headers.forEach((_, i) => { ws.getColumn(i + 1).width = 18; });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  res.setHeader('Cache-Control', 'no-store');
  await wb.xlsx.write(res);
}

async function exportDocx(res, filename, data) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } = require('docx');
  const headerRow = new TableRow({
    children: data.headers.map((h) => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [new TextRun({ text: h, bold: true, color: 'F8FAFC', rightToLeft: true })]
      })],
      shading: { fill: '0F172A' }
    }))
  });
  const bodyRows = data.rows.map((row) => new TableRow({
    children: Object.values(row).map((v) => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        bidirectional: true,
        children: [new TextRun({ text: formatCell(v), rightToLeft: true })]
      })]
    }))
  }));
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          children: [new TextRun({ text: data.title || 'تصدير', bold: true, size: 32, rightToLeft: true })]
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: APP_TITLE, rightToLeft: true })]
        }),
        new Paragraph({ text: '' }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] }),
        new Paragraph({ text: '' }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: EXPORT_ISSUED, rightToLeft: true, size: 20 })]
        })
      ]
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.docx"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}

function targetBundleToTableData(bundle) {
  const t = bundle.target;
  const nameDisplay = t.english_name ? `${t.full_name} (${t.english_name})` : t.full_name;
  const rows = [
    { k: 'الاسم', v: nameDisplay },
    { k: 'رقم الهوية', v: t.national_id || '-' },
    { k: 'الهاتف', v: t.phone || '-' },
    { k: 'شركة الاتصالات', v: t.telecom_company || '-' },
    { k: 'نوع الجوال والنظام', v: t.phone_model || '-' },
    { k: 'البريد الالكتروني', v: t.email || '-' },
    { k: 'العنوان', v: t.address || '-' },
    { k: 'رابط Google Maps', v: t.maps_url || '-' },
    { k: 'تاريخ الميلاد', v: t.date_of_birth ? formatBirthDualAr(t.date_of_birth) : '-' },
    { k: 'الجنسية', v: t.nationality || '-' },
    { k: 'المهنة', v: t.occupation || '-' },
    { k: 'جهة العمل', v: t.employer || '-' },
    { k: 'الحالة', v: t.status === 'archived' ? 'مؤرشف' : 'نشط' },
    { k: 'الملخص', v: t.summary || '-' },
    { k: 'مستندات', v: String((bundle.documents || []).length) },
    { k: 'ملاحظات', v: String((bundle.notes || []).length) },
    { k: 'حسابات', v: String((bundle.social || []).length) },
    { k: 'بطاقات', v: String((bundle.cards || []).length) },
    { k: 'أحداث زمنية', v: String((bundle.timeline || []).length) }
  ];
  return {
    title: `ملف الهدف - ${t.full_name}`,
    headers: ['البند', 'القيمة'],
    rows
  };
}

async function sendListExport(res, format, targets) {
  const data = buildListExportData(targets);
  const filename = 'targets';
  const fmt = (format || 'pdf').toLowerCase();
  if (fmt === 'pdf') {
    const html = buildListHtml(data);
    const buf = await htmlToPdfBuffer(html);
    return sendPdfBuffer(res, buf, filename);
  }
  if (fmt === 'html') return exportHtmlFile(res, filename, buildListHtml(data));
  if (fmt === 'xlsx') return exportXlsx(res, filename, data);
  if (fmt === 'docx') return exportDocx(res, filename, data);
  if (fmt === 'txt') return exportTxt(res, filename, data);
  return exportCsv(res, filename, data);
}

async function sendTargetExport(res, format, bundle) {
  const safeName = String(bundle.target.full_name || 'target').replace(/[^\w\u0600-\u06FF\-]+/g, '_').slice(0, 40);
  const filename = `target_${bundle.target.id}_${safeName}`;
  const fmt = (format || 'pdf').toLowerCase();
  if (fmt === 'pdf') {
    const html = buildTargetReportHtml(bundle);
    const buf = await htmlToPdfBuffer(html);
    return sendPdfBuffer(res, buf, filename);
  }
  if (fmt === 'html') return exportHtmlFile(res, filename, buildTargetReportHtml(bundle));
  const data = targetBundleToTableData(bundle);
  if (fmt === 'xlsx') return exportXlsx(res, filename, data);
  if (fmt === 'docx') return exportDocx(res, filename, data);
  if (fmt === 'txt') return exportTxt(res, filename, data);
  return exportCsv(res, filename, data);
}

async function checkChromeForPdf() {
  try {
    const exe = await resolveChromeExecutable();
    return { ok: !!(exe && fs.existsSync(exe)), path: exe || null };
  } catch {
    return { ok: false, path: null };
  }
}

module.exports = {
  sendListExport,
  sendTargetExport,
  checkChromeForPdf,
  APP_TITLE
};
