let targetId = null;

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach((p) => {
    p.classList.toggle('active', p.id === 'tab-' + name);
  });
}

function getDatePartsLocal(date) {
  if (date == null || date === '') return null;
  if (typeof date === 'string') {
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  }
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

function calcAgeYearsLocal(y, m, d, nowY, nowM, nowD) {
  let age = nowY - y;
  if (nowM < m || (nowM === m && nowD < d)) age -= 1;
  return age < 0 ? 0 : age;
}

function formatDateArSimple(date) {
  const p = getDatePartsLocal(date);
  if (!p) return '-';
  return `${p.y}/${p.m}/${p.d}م`;
}

function formatBirthDualAr(date) {
  const p = getDatePartsLocal(date);
  if (!p) return '-';
  const g = `${p.y}/${p.m}/${p.d}م`;
  const now = new Date();
  const gAge = calcAgeYearsLocal(p.y, p.m, p.d, now.getFullYear(), now.getMonth() + 1, now.getDate());
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
    const h = partsOf(birthUtc);
    const n = partsOf(nowUtc);
    if (!h.y || !h.m || !h.d) return `${g} (${gAge} سنة)`;
    const hAge = calcAgeYearsLocal(h.y, h.m, h.d, n.y, n.m, n.d);
    return `${g} (${gAge} سنة) - ${h.y}/${h.m}/${h.d}هـ (${hAge} سنة)`;
  } catch {
    return `${g} (${gAge} سنة)`;
  }
}

async function loadTarget() {
  const data = await api('/targets/' + targetId);
  const t = data.target;
  const nameDisplay = t.english_name
    ? `${t.full_name || ''} (${t.english_name})`
    : (t.full_name || 'ملف الهدف');
  document.getElementById('target-name').textContent = nameDisplay;
  const photoEl = document.getElementById('target-photo');
  if (photoEl) {
    if (t.photo_url) {
      photoEl.src = t.photo_url + (t.photo_url.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(t.updated_at || Date.now());
      photoEl.hidden = false;
    } else {
      photoEl.removeAttribute('src');
      photoEl.hidden = true;
    }
  }
  document.getElementById('target-summary').textContent = t.summary || 'لا يوجد ملخص بعد.';
  document.getElementById('edit-link').href = '/pages/target-edit.html?id=' + targetId;
  const exportDd = document.getElementById('target-export');
  if (exportDd) exportDd.dataset.id = String(targetId);

  const badge = document.getElementById('target-status');
  badge.textContent = t.status_label || t.status;
  badge.className = 'badge ' + (t.status === 'archived' ? 'badge-archived' : 'badge-active');

  const [socialData, docsData, cardsData] = await Promise.all([
    api('/targets/' + targetId + '/social'),
    api('/targets/' + targetId + '/documents'),
    api('/targets/' + targetId + '/cards')
  ]);

  const accounts = (socialData.social || []).map((s) => {
    const rawUser = String(s.username || '').trim();
    const user = rawUser
      ? (rawUser.startsWith('@') ? rawUser : `@${rawUser}`)
      : '-';
    return `${s.platform || '-'} : (${user})`;
  }).join('\n') || '-';
  const cards = (cardsData.cards || []).map((c) => {
    const num = String(c.card_number || '').replace(/\D/g, '');
    const spaced = num ? num.replace(/(\d{4})(?=\d)/g, '$1 ').trim() : (c.last_four || '');
    const exp = c.exp_label ? String(c.exp_label).replace(/\//g, '-') : null;
    return [
      c.cardholder_name,
      c.brand_label || c.brand,
      spaced,
      exp,
      c.cvv ? `CVV ${c.cvv}` : null,
      c.bank_name
    ].filter(Boolean).join(' - ');
  }).join('\n') || '-';
  const docs = (docsData.documents || []).map((d) => d.title).join(' | ') || '-';

  const rows = [
    ['الاسم الكامل', nameDisplay],
    ['رقم الهوية', t.national_id || '-'],
    ['تاريخ انتهاء البطاقة المدنية', t.civil_id_expiry ? formatDateArSimple(t.civil_id_expiry) : '-'],
    ['الجنسية', t.nationality || '-'],
    ['الجنس', t.gender || '-'],
    ['تاريخ الميلاد', t.date_of_birth ? formatBirthDualAr(t.date_of_birth) : '-'],
    ['فصيلة الدم', t.blood_type || '-'],
    ['الهاتف', t.phone || '-'],
    ['شركة الاتصالات', t.telecom_company || '-'],
    ['نوع الجوال والنظام', t.phone_model || '-'],
    ['البريد الالكتروني', t.email || '-'],
    ['العنوان', t.address || '-'],
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
    ['الحالة', t.status_label || t.status],
    ['ملخص الملف', t.summary || '-'],
    ['أُنشئ', formatDateTimeAr(t.created_at)],
    ['آخر تحديث', formatDateTimeAr(t.updated_at)]
  ];

  const grid = document.getElementById('target-meta');
  grid.className = 'profile-table-wrap';
  grid.innerHTML = `<table class="profile-table"><thead><tr><th>العنصر</th><th>البيانات</th></tr></thead><tbody>${
    rows.map(([label, value]) => {
      let cell = escapeHtml(value || '-');
      if (label === 'رابط Google Maps' && value && value !== '-' && /^https?:\/\//i.test(value)) {
        cell = `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">${escapeHtml(value)}</a>`;
      }
      return `<tr><td class="col-key">${escapeHtml(label)}</td><td class="col-val">${cell}</td></tr>`;
    }).join('')
  }</tbody></table>`;
}

async function loadDocuments() {
  const data = await api('/targets/' + targetId + '/documents');
  const box = document.getElementById('docs-list');
  if (!data.documents.length) {
    box.innerHTML = '<p class="empty-state">لا توجد مستندات</p>';
    return;
  }
  box.innerHTML = data.documents.map((d) => `
    <article class="stack-item">
      <h3>${escapeHtml(d.title)}</h3>
      <p>${escapeHtml(d.description || '')}</p>
      <div class="meta-line">
        <span>${escapeHtml(d.original_name)}</span>
        <span>${dtArHtml(d.created_at)}</span>
      </div>
      <div class="row-actions">
        <a class="btn btn-ghost" href="/api/targets/${targetId}/documents/${d.id}/download"><i class="fa-solid fa-download"></i>تنزيل</a>
        <button type="button" class="btn btn-danger" data-del-doc="${d.id}"><i class="fa-solid fa-trash"></i>حذف</button>
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-del-doc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('حذف المستند؟')) return;
      try {
        await api('/targets/' + targetId + '/documents/' + btn.dataset.delDoc, { method: 'DELETE' });
        showToast('تم حذف المستند');
        loadDocuments();
      } catch (e) {
        showToast(e.message, true);
      }
    });
  });
}

async function loadNotes() {
  const data = await api('/targets/' + targetId + '/notes');
  const box = document.getElementById('notes-list');
  if (!data.notes.length) {
    box.innerHTML = '<p class="empty-state">لا توجد ملاحظات</p>';
    return;
  }
  box.innerHTML = data.notes.map((n) => `
    <article class="stack-item">
      <div class="meta-line">
        <span class="badge badge-active">${escapeHtml(n.note_type_label || n.note_type)}</span>
        <span>${dtArHtml(n.created_at)}</span>
      </div>
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.body || '')}</p>
      ${n.url ? `<a href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(n.url)}</a>` : ''}
      <div class="row-actions">
        <button type="button" class="btn btn-ghost" data-edit-note="${encodeURIComponent(JSON.stringify({ id: n.id, title: n.title, body: n.body || '', note_type: n.note_type, url: n.url || '' }))}"><i class="fa-solid fa-pen"></i>تعديل</button>
        <button type="button" class="btn btn-danger" data-del-note="${n.id}"><i class="fa-solid fa-trash"></i>حذف</button>
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-del-note]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('حذف الملاحظة؟')) return;
      try {
        await api('/targets/' + targetId + '/notes/' + btn.dataset.delNote, { method: 'DELETE' });
        showToast('تم الحذف');
        loadNotes();
      } catch (e) {
        showToast(e.message, true);
      }
    });
  });
  box.querySelectorAll('[data-edit-note]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      let item;
      try { item = JSON.parse(decodeURIComponent(btn.getAttribute('data-edit-note'))); } catch { return; }
      const title = prompt('العنوان', item.title);
      if (title == null) return;
      const body = prompt('المحتوى', item.body || '');
      if (body == null) return;
      const url = prompt('الرابط', item.url || '');
      if (url == null) return;
      const note_type = prompt('النوع: note أو link أو investigation', item.note_type || 'note');
      if (note_type == null) return;
      try {
        await api('/targets/' + targetId + '/notes/' + item.id, {
          method: 'PUT',
          body: { title: title.trim(), body, url, note_type: note_type.trim() }
        });
        showToast('تم التعديل');
        loadNotes();
        loadTarget();
      } catch (e) {
        showToast(e.message, true);
      }
    });
  });
}

async function loadSocial() {
  const data = await api('/targets/' + targetId + '/social');
  const box = document.getElementById('social-list');
  if (!data.social.length) {
    box.innerHTML = '<p class="empty-state">لا توجد حسابات</p>';
    return;
  }
  box.innerHTML = data.social.map((s) => `
    <article class="stack-item">
      <h3>${escapeHtml(s.platform)}${s.username ? ' - ' + escapeHtml(s.username) : ''}</h3>
      <p>${escapeHtml(s.notes || '')}</p>
      ${s.profile_url ? `<a href="${escapeHtml(s.profile_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.profile_url)}</a>` : ''}
      <div class="row-actions">
        <button type="button" class="btn btn-ghost" data-edit-social="${encodeURIComponent(JSON.stringify({ id: s.id, platform: s.platform, username: s.username || '', profile_url: s.profile_url || '', notes: s.notes || '' }))}"><i class="fa-solid fa-pen"></i>تعديل</button>
        <button type="button" class="btn btn-danger" data-del-social="${s.id}"><i class="fa-solid fa-trash"></i>حذف</button>
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-del-social]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('حذف الحساب؟')) return;
      try {
        await api('/targets/' + targetId + '/social/' + btn.dataset.delSocial, { method: 'DELETE' });
        showToast('تم الحذف');
        loadSocial();
        loadTarget();
      } catch (e) {
        showToast(e.message, true);
      }
    });
  });
  box.querySelectorAll('[data-edit-social]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      let item;
      try { item = JSON.parse(decodeURIComponent(btn.getAttribute('data-edit-social'))); } catch { return; }
      const platform = prompt('المنصة', item.platform);
      if (platform == null) return;
      const username = prompt('اسم المستخدم', item.username);
      if (username == null) return;
      const profile_url = prompt('رابط الملف', item.profile_url);
      if (profile_url == null) return;
      const notes = prompt('ملاحظات', item.notes);
      if (notes == null) return;
      try {
        await api('/targets/' + targetId + '/social/' + item.id, {
          method: 'PUT',
          body: { platform: platform.trim(), username, profile_url, notes }
        });
        showToast('تم التعديل');
        loadSocial();
        loadTarget();
      } catch (e) {
        showToast(e.message, true);
      }
    });
  });
}

async function loadTimeline() {
  const data = await api('/targets/' + targetId + '/timeline');
  const box = document.getElementById('timeline-list');
  if (!data.timeline.length) {
    box.innerHTML = '<p class="empty-state">لا أحداث بعد</p>';
    return;
  }
  box.innerHTML = data.timeline.map((e) => `
    <article class="stack-item">
      <div class="meta-line">
        <span>${dtArHtml(e.event_at)}</span>
        ${e.source ? `<span>${escapeHtml(e.source)}</span>` : ''}
      </div>
      <h3>${escapeHtml(e.title)}</h3>
      <p>${escapeHtml(e.description || '')}</p>
      <div class="row-actions">
        <button type="button" class="btn btn-ghost" data-edit-event="${encodeURIComponent(JSON.stringify({ id: e.id, title: e.title, description: e.description || '', source: e.source || '', event_at: e.event_at }))}"><i class="fa-solid fa-pen"></i>تعديل</button>
        <button type="button" class="btn btn-danger" data-del-event="${e.id}"><i class="fa-solid fa-trash"></i>حذف</button>
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-del-event]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('حذف الحدث؟')) return;
      try {
        await api('/targets/' + targetId + '/timeline/' + btn.dataset.delEvent, { method: 'DELETE' });
        showToast('تم الحذف');
        loadTimeline();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
  box.querySelectorAll('[data-edit-event]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      let item;
      try { item = JSON.parse(decodeURIComponent(btn.getAttribute('data-edit-event'))); } catch { return; }
      const title = prompt('عنوان الحدث', item.title);
      if (title == null) return;
      const description = prompt('التفاصيل', item.description || '');
      if (description == null) return;
      const source = prompt('المصدر', item.source || '');
      if (source == null) return;
      const defaultAt = item.event_at ? String(item.event_at).slice(0, 16).replace(' ', 'T') : toDatetimeLocalValue(new Date());
      const event_at = prompt('الوقت (YYYY-MM-DDTHH:MM)', defaultAt);
      if (event_at == null) return;
      try {
        await api('/targets/' + targetId + '/timeline/' + item.id, {
          method: 'PUT',
          body: { title: title.trim(), description, source, event_at }
        });
        showToast('تم التعديل');
        loadTimeline();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '');
}

function detectCardBrand(num) {
  const n = digitsOnly(num);
  if (/^4\d{0,18}$/.test(n) && n.length >= 1) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^6(?:011|5)/.test(n)) return 'discover';
  if (/^62/.test(n)) return 'unionpay';
  return 'unknown';
}

async function loadCards() {
  const data = await api('/targets/' + targetId + '/cards');
  const box = document.getElementById('cards-list');
  if (!data.cards.length) {
    box.innerHTML = '<p class="empty-state">لا توجد بطاقات</p>';
    return;
  }
  box.innerHTML = data.cards.map((c) => `
    <article class="stack-item">
      <div class="meta-line">
        <span class="badge badge-active">${escapeHtml(c.brand_label || c.brand)}</span>
        ${c.exp_label ? `<span>${escapeHtml(c.exp_label)}</span>` : ''}
        <span>${dtArHtml(c.created_at)}</span>
      </div>
      <h3>${escapeHtml(c.cardholder_name || 'بطاقة بدون اسم حامل')}</h3>
      <p dir="ltr">${escapeHtml(c.card_number || c.masked_number || '')}</p>
      ${c.cvv ? `<p dir="ltr">CVV: ${escapeHtml(c.cvv)}</p>` : ''}
      ${c.bank_name ? `<p>${escapeHtml(c.bank_name)}</p>` : ''}
      ${c.notes ? `<p>${escapeHtml(c.notes)}</p>` : ''}
      <div class="row-actions">
        <button type="button" class="btn btn-ghost" data-edit-card="${encodeURIComponent(JSON.stringify({ id: c.id, cardholder_name: c.cardholder_name || '', brand: c.brand || 'unknown', card_number: c.card_number || '', exp: c.exp_label || '', cvv: c.cvv || '', bank_name: c.bank_name || '', notes: c.notes || '' }))}"><i class="fa-solid fa-pen"></i>تعديل</button>
        <button type="button" class="btn btn-danger" data-del-card="${c.id}"><i class="fa-solid fa-trash"></i>حذف</button>
      </div>
    </article>`).join('');
  box.querySelectorAll('[data-del-card]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('حذف البطاقة؟')) return;
      try {
        await api('/targets/' + targetId + '/cards/' + btn.dataset.delCard, { method: 'DELETE' });
        showToast('تم الحذف');
        loadCards();
        loadTarget();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
  box.querySelectorAll('[data-edit-card]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      let item;
      try { item = JSON.parse(decodeURIComponent(btn.getAttribute('data-edit-card'))); } catch { return; }
      const cardholder_name = prompt('اسم الحامل', item.cardholder_name);
      if (cardholder_name == null) return;
      const card_number = prompt('رقم البطاقة', item.card_number);
      if (card_number == null) return;
      const brand = prompt('النوع (visa/mastercard/mada/...)', item.brand);
      if (brand == null) return;
      const exp = prompt('الانتهاء MM/YY', item.exp);
      if (exp == null) return;
      const cvv = prompt('CVV (خلف البطاقة)', item.cvv);
      if (cvv == null) return;
      const bank_name = prompt('البنك', item.bank_name);
      if (bank_name == null) return;
      const notes = prompt('ملاحظات', item.notes);
      if (notes == null) return;
      try {
        await api('/targets/' + targetId + '/cards/' + item.id, {
          method: 'PUT',
          body: { cardholder_name, card_number, brand, exp, cvv, bank_name, notes }
        });
        showToast('تم التعديل');
        loadCards();
        loadTarget();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  targetId = qs('id');
  if (!targetId) {
    showToast('معرّف مفقود', true);
    return;
  }

  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('doc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    if (!fd.get('file') || !fd.get('file').size) {
      showToast('اختر ملفًا', true);
      return;
    }
    try {
      await api('/targets/' + targetId + '/documents', { method: 'POST', body: fd });
      form.reset();
      showToast('تم رفع المستند');
      loadDocuments();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('note-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    try {
      await api('/targets/' + targetId + '/notes', {
        method: 'POST',
        body: {
          title: String(fd.get('title') || '').trim(),
          body: String(fd.get('body') || '').trim(),
          note_type: String(fd.get('note_type') || 'note'),
          url: String(fd.get('url') || '').trim()
        }
      });
      form.reset();
      showToast('تمت الإضافة');
      loadNotes();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  document.getElementById('social-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    try {
      await api('/targets/' + targetId + '/social', {
        method: 'POST',
        body: {
          platform: String(fd.get('platform') || '').trim(),
          username: String(fd.get('username') || '').trim(),
          profile_url: String(fd.get('profile_url') || '').trim(),
          notes: String(fd.get('notes') || '').trim()
        }
      });
      form.reset();
      showToast('تمت الإضافة');
      loadSocial();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  const cardNumberInput = document.getElementById('card_number');
  const cardBrandSelect = document.getElementById('card_brand');
  if (cardNumberInput && cardBrandSelect) {
    cardNumberInput.addEventListener('input', () => {
      const raw = digitsOnly(cardNumberInput.value);
      const spaced = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
      cardNumberInput.value = spaced;
      if (cardBrandSelect.value === 'unknown' || cardBrandSelect.dataset.auto === '1') {
        cardBrandSelect.value = detectCardBrand(raw);
        cardBrandSelect.dataset.auto = '1';
      }
    });
    cardBrandSelect.addEventListener('change', () => {
      cardBrandSelect.dataset.auto = '0';
    });
  }

  document.getElementById('card-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    try {
      await api('/targets/' + targetId + '/cards', {
        method: 'POST',
        body: {
          cardholder_name: String(fd.get('cardholder_name') || '').trim(),
          brand: String(fd.get('brand') || 'unknown'),
          card_number: String(fd.get('card_number') || '').trim(),
          exp: String(fd.get('exp') || '').trim(),
          cvv: String(fd.get('cvv') || '').trim(),
          bank_name: String(fd.get('bank_name') || '').trim(),
          notes: String(fd.get('notes') || '').trim()
        }
      });
      form.reset();
      if (cardBrandSelect) cardBrandSelect.dataset.auto = '1';
      showToast('تم حفظ البطاقة');
      loadCards();
      loadTarget();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  const eventAt = document.getElementById('event_at');
  if (eventAt) eventAt.value = toDatetimeLocalValue(new Date());

  document.getElementById('timeline-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    try {
      await api('/targets/' + targetId + '/timeline', {
        method: 'POST',
        body: {
          title: String(fd.get('title') || '').trim(),
          description: String(fd.get('description') || '').trim(),
          source: String(fd.get('source') || '').trim(),
          event_at: String(fd.get('event_at') || '')
        }
      });
      form.reset();
      eventAt.value = toDatetimeLocalValue(new Date());
      showToast('تمت الإضافة');
      loadTimeline();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  try {
    await loadTarget();
    await Promise.all([loadDocuments(), loadNotes(), loadSocial(), loadCards(), loadTimeline()]);
    initExportDropdowns();
  } catch (e) {
    showToast(e.message, true);
  }
});
