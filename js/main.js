function apiUrl(path) {
  return '/api' + path;
}

async function api(path, options = {}) {
  const opts = { ...options };
  opts.headers = { ...(options.headers || {}) };
  if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }
  const res = await fetch(apiUrl(path), opts);
  const type = res.headers.get('content-type') || '';
  if (!res.ok) {
    let msg = 'طلب فاشل';
    if (type.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      msg = data.error || msg;
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  if (type.includes('application/json')) return res.json();
  return res;
}

function showToast(message, isError) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.toggle('error', !!isError);
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2800);
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

function dtArHtml(date, withTime) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '<span class="dt-ar"><span class="dt-ar__num">-</span></span>';
  }
  const datePart = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  let timeHtml = '';
  if (withTime !== false) {
    let h = d.getHours();
    const ampm = h >= 12 ? 'م' : 'ص';
    h = h % 12;
    if (h === 0) h = 12;
    const m = String(d.getMinutes()).padStart(2, '0');
    timeHtml = `<span class="dt-ar__time"><span class="dt-ar__num">${h}:${m}</span><span class="dt-ar__mark">${ampm}</span></span>`;
  }
  return `<span class="dt-ar"><span class="dt-ar__date"><span class="dt-ar__num">${datePart}</span><span class="dt-ar__mark">م</span></span>${timeHtml}</span>`;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', document.body.classList.contains('nav-open') ? 'true' : 'false');
    });
  }
  const page = document.body.dataset.page;
  document.querySelectorAll('.sidebar-nav a').forEach((a) => {
    if (a.dataset.page === page) a.classList.add('active');
  });
}

function initExportDropdowns() {
  document.querySelectorAll('.export-dropdown').forEach((dd) => {
    const btn = dd.querySelector('.export-toggle');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.export-dropdown.open').forEach((d) => {
        if (d !== dd) d.classList.remove('open');
      });
      dd.classList.toggle('open');
    });
    dd.querySelectorAll('[data-format]').forEach((b) => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', () => {
        dd.classList.remove('open');
        const entity = dd.dataset.entity || 'targets';
        const id = dd.dataset.id || '';
        const extra = dd.dataset.exportQuery || '';
        exportWithAuth(entity, b.dataset.format, id, extra);
      });
    });
  });
  if (!document.body.dataset.exportDocClick) {
    document.body.dataset.exportDocClick = '1';
    document.addEventListener('click', () => {
      document.querySelectorAll('.export-dropdown.open').forEach((d) => d.classList.remove('open'));
    });
  }
}

async function exportWithAuth(entity, format, id, extraQuery) {
  try {
    showToast('جاري التصدير...');
    let path = '/export/' + entity;
    if (id) path += '/' + encodeURIComponent(id);
    path += '?format=' + encodeURIComponent(format) + (extraQuery || '') + '&_=' + Date.now();
    const res = await fetch(apiUrl(path), { cache: 'no-store' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'فشل التصدير');
    }
    const blob = await res.blob();
    if (format === 'pdf') {
      const head = await blob.slice(0, 5).text();
      if (head !== '%PDF-') throw new Error('ملف PDF غير صالح');
    }
    const cd = res.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="?([^";]+)"?/i);
    const filename = m ? m[1] : entity + '.' + format;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('تم التصدير');
  } catch (e) {
    showToast(e.message || 'فشل التصدير', true);
  }
}

function toDatetimeLocalValue(date) {
  const d = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initExportDropdowns();
});

window.api = api;
window.showToast = showToast;
window.formatDateTimeAr = formatDateTimeAr;
window.dtArHtml = dtArHtml;
window.escapeHtml = escapeHtml;
window.qs = qs;
window.exportWithAuth = exportWithAuth;
window.toDatetimeLocalValue = toDatetimeLocalValue;
