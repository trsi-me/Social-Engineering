async function loadTargets() {
  const q = document.getElementById('search-q').value.trim();
  const status = document.getElementById('status-filter').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status) params.set('status', status);
  const data = await api('/targets?' + params.toString());
  const tbody = document.querySelector('#targets-table tbody');
  const empty = document.getElementById('targets-empty');
  tbody.innerHTML = '';
  if (!data.targets.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  data.targets.forEach((t) => {
    const tr = document.createElement('tr');
    const badgeClass = t.status === 'archived' ? 'badge-archived' : 'badge-active';
    tr.innerHTML = `
      <td>${escapeHtml(t.full_name)}</td>
      <td>${escapeHtml(t.national_id || '-')}</td>
      <td>${escapeHtml(t.phone || '-')}</td>
      <td>${escapeHtml(t.email || '-')}</td>
      <td><span class="badge ${badgeClass}">${escapeHtml(t.status_label || t.status)}</span></td>
      <td>${dtArHtml(t.updated_at)}</td>
      <td>
        <div class="row-actions">
          <a class="btn btn-ghost" href="/pages/target-view.html?id=${t.id}"><i class="fa-solid fa-folder-open"></i>فتح</a>
          <a class="btn btn-ghost" href="/pages/target-edit.html?id=${t.id}"><i class="fa-solid fa-pen"></i>تعديل</a>
          <button type="button" class="btn btn-danger" data-del="${t.id}"><i class="fa-solid fa-trash"></i>حذف</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('[data-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('حذف هذا الملف؟')) return;
      try {
        await api('/targets/' + btn.dataset.del, { method: 'DELETE' });
        showToast('تم الحذف');
        loadTargets();
      } catch (e) {
        showToast(e.message, true);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('search-q');
  const status = document.getElementById('status-filter');
  let timer;
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => loadTargets().catch((e) => showToast(e.message, true)), 250);
  });
  status.addEventListener('change', () => loadTargets().catch((e) => showToast(e.message, true)));
  loadTargets().catch((e) => showToast(e.message, true));
});
