function collectTargetForm(form) {
  const fd = new FormData(form);
  return {
    full_name: String(fd.get('full_name') || '').trim(),
    english_name: String(fd.get('english_name') || '').trim(),
    national_id: String(fd.get('national_id') || '').trim(),
    phone: String(fd.get('phone') || '').trim(),
    telecom_company: String(fd.get('telecom_company') || '').trim(),
    phone_model: String(fd.get('phone_model') || '').trim(),
    email: String(fd.get('email') || '').trim(),
    address: String(fd.get('address') || '').trim(),
    maps_url: String(fd.get('maps_url') || '').trim(),
    date_of_birth: String(fd.get('date_of_birth') || '').trim() || null,
    civil_id_expiry: String(fd.get('civil_id_expiry') || '').trim() || null,
    nationality: String(fd.get('nationality') || '').trim(),
    gender: String(fd.get('gender') || '').trim(),
    blood_type: String(fd.get('blood_type') || '').trim(),
    occupation: String(fd.get('occupation') || '').trim(),
    employer: String(fd.get('employer') || '').trim(),
    status: String(fd.get('status') || 'active'),
    summary: String(fd.get('summary') || '').trim(),
    companies_text: String(fd.get('companies_text') || '').trim(),
    travels_text: String(fd.get('travels_text') || '').trim(),
    academic_text: String(fd.get('academic_text') || '').trim(),
    career_text: String(fd.get('career_text') || '').trim(),
    research_text: String(fd.get('research_text') || '').trim(),
    assessment_text: String(fd.get('assessment_text') || '').trim()
  };
}

function fillTargetForm(form, t) {
  const set = (name, val) => {
    if (!form[name]) return;
    form[name].value = val == null ? '' : val;
  };
  set('full_name', t.full_name);
  set('english_name', t.english_name);
  set('national_id', t.national_id);
  set('phone', t.phone);
  set('telecom_company', t.telecom_company);
  set('phone_model', t.phone_model);
  set('email', t.email);
  set('address', t.address);
  set('maps_url', t.maps_url);
  set('date_of_birth', t.date_of_birth ? String(t.date_of_birth).slice(0, 10) : '');
  set('civil_id_expiry', t.civil_id_expiry ? String(t.civil_id_expiry).slice(0, 10) : '');
  set('nationality', t.nationality);
  set('gender', t.gender);
  set('blood_type', t.blood_type);
  set('occupation', t.occupation);
  set('employer', t.employer);
  set('status', t.status || 'active');
  set('summary', t.summary);
  set('companies_text', t.companies_text);
  set('travels_text', t.travels_text);
  set('academic_text', t.academic_text);
  set('career_text', t.career_text);
  set('research_text', t.research_text);
  set('assessment_text', t.assessment_text);
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('target-form');
  if (!form) return;
  const id = qs('id');
  const isEdit = form.dataset.mode === 'edit';

  if (isEdit) {
    if (!id) {
      showToast('معرّف مفقود', true);
      return;
    }
    const back = document.getElementById('back-view');
    if (back) back.href = '/pages/target-view.html?id=' + encodeURIComponent(id);
    try {
      const data = await api('/targets/' + id);
      fillTargetForm(form, data.target);
      document.getElementById('page-title').textContent = 'تعديل: ' + data.target.full_name;
      const previewWrap = document.getElementById('photo-preview-wrap');
      const preview = document.getElementById('photo-preview');
      if (previewWrap && preview && data.target.photo_url) {
        preview.src = data.target.photo_url;
        previewWrap.hidden = false;
      }
    } catch (e) {
      showToast(e.message, true);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = collectTargetForm(form);
    if (!payload.full_name) {
      showToast('الاسم الكامل مطلوب', true);
      return;
    }
    try {
      let savedId = id;
      if (isEdit) {
        await api('/targets/' + id, { method: 'PUT', body: payload });
        savedId = id;
      } else {
        const data = await api('/targets', { method: 'POST', body: payload });
        savedId = data.target.id;
      }
      const photoInput = form.photo;
      if (photoInput && photoInput.files && photoInput.files[0]) {
        const fd = new FormData();
        fd.append('photo', photoInput.files[0]);
        await api('/targets/' + savedId + '/photo', { method: 'POST', body: fd });
      }
      showToast(isEdit ? 'تم حفظ كل التعديلات' : 'تم إنشاء الملف');
      location.href = '/pages/target-view.html?id=' + encodeURIComponent(savedId);
    } catch (err) {
      showToast(err.message, true);
    }
  });

  const phoneInput = form.phone;
  const telecomInput = form.telecom_company;
  if (phoneInput && telecomInput) {
    const fillCarrier = () => {
      if (telecomInput.value.trim()) return;
      const digits = String(phoneInput.value || '').replace(/\D/g, '');
      let local = digits;
      if (local.startsWith('965') && local.length >= 11) local = local.slice(-8);
      if (local.length !== 8) return;
      if (local.startsWith('41')) telecomInput.value = 'Virgin Mobile (على شبكة STC)';
      else if (local[0] === '9') telecomInput.value = 'Zain';
      else if (local[0] === '6') telecomInput.value = 'Ooredoo';
      else if (local[0] === '5') telecomInput.value = 'STC';
    };
    phoneInput.addEventListener('blur', fillCarrier);
  }
});
