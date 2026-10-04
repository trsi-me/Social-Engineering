# Social Engineering

نظام سجلات محلي لملفات أهداف. الواجهة عربية وتدير البيانات الشخصية والملاحظات والحسابات والخط الزمني والوثائق وبطاقات البنك، وتصدّر الملف بصيغ عدة. وصف الحزمة في `package.json`: «نظام ملفات أهداف للهندسة الاجتماعية المصرّحة»، والإصدار `1.0.0`.

التشغيل المقبول هو سياق مصرّح به. هذا الملف يوثّق ما يفعله البرنامج ولا يشرح أساليب هجوم.

## 1. ما هو المشروع

خادم Express يقدّم صفحات ثابتة وواجهة `/api`. البيانات في MySQL بقاعدة اسمها الافتراضي `social_engineering`. الصفحة الأولى تحوّل إلى قائمة الأهداف. كل هدف صفحة عرض وصفحة تعديل وصفحة إنشاء.

## 2. لماذا يوجد هذا المشروع

الجداول تجمع هوية وتواصل وعمل ودراسة وسفر وتقييم، مع وثائق وملاحظات بثلاثة أنواع وحسابات منصات وأحداث زمنية وبطاقات. التصدير يبني ملفاً واحداً من هذه الكتل. استنتاج من الكود: الغرض الظاهر تنظيم سجل هدف في شاشة واحدة ثم إخراجه.

## 3. من يستخدمه

مستخدم يفتح المتصفح على المنفذ 3090. أدوار وحسابات دخول: «غير موجود في الملفات الحالية». كل المسارات الحالية بلا تسجيل دخول.

## 4. ماذا يستطيع النظام أن يفعل

- قائمة أهداف بحالة `active` أو `archived` مع حذف منطقي عبر `deleted_at`.
- إنشاء وتعديل وحذف هدف.
- حقول الهوية: الاسم والهوية الوطنية والجوال وشركة الاتصالات وطراز الهاتف والبريد والعنوان ورابط خرائط وتاريخ الميلاد والجنسية والجنس وفصيلة الدم وانتهاء البطاقة المدنية والمهنة وجهة العمل والملخص.
- نصوص حرة: شركات، سفر، دراسة، مسار مهني، بحث، تقييم.
- تخمين شركة الاتصالات الكويتية من رقم محلي من 8 أرقام: البداية 41 ثم Virgin Mobile على شبكة STC، و9 لـ Zain، و6 لـ Ooredoo، و5 لـ STC.
- صورة ملف شخصي JPG أو PNG أو WebP بحد 5 ميغابايت.
- وثائق PDF أو JPEG أو PNG أو WebP أو GIF بحد `UPLOAD_MAX_MB` والافتراضي 20.
- ملاحظات من نوع `note` أو `link` أو `investigation`.
- حسابات منصات: اسم المنصة واسم المستخدم ورابط وملاحظات.
- أحداث خط زمني بتاريخ وعنوان ووصف ومصدر.
- بطاقات: اسم حامل البطاقة والعلامة ورقم البطاقة وآخر أربعة أرقام والشهر والسنة ورمز الأمان واسم البنك وملاحظات.
- تصدير قائمة أو ملف واحد بصيغ pdf وhtml وxlsx وdocx وtxt وcsv.
- عرض التاريخ الميلادي بصيغة `YYYY/M/Dم` والعمر الميلادي والهجري عبر تقويم أم القرى.

## 5. كيف يعمل النظام

```
المتصفح
  -> pages/*.html و js/*.js
  -> /api/targets وما يتفرع عنه
  -> mysql2 بمعاملات
  -> MySQL
الصور والوثائق
  -> uploads/targets/<id>/
```

## 6. أمثلة واقعية

1. فتح `/` ينتقل إلى `/pages/targets.html`.
2. إنشاء هدف من `/pages/target-new.html` يرسل `POST /api/targets`.
3. فتح `/pages/target-view.html` يقرأ `GET /api/targets/:id` ثم الملاحظات والوثائق والحسابات والخط الزمني والبطاقات.
4. رفع صورة يرسل `POST /api/targets/:id/photo` ويحفظ الملف باسم `profile` مع الامتداد المسموح.
5. رفع وثيقة يرسل `POST /api/targets/:id/documents`.
6. التصدير `GET /api/export/targets?format=pdf` أو `GET /api/export/targets/:id?format=xlsx`.
7. الحذف يضع `deleted_at` للهدف، بينما حذف وثيقة أو ملاحظة أو حساب أو حدث أو بطاقة حذف فعلي للصف.

لا تُدرج في الوثائق قيم حقول حقيقية ولا محتوى مجلد `uploads`.

## 7. رحلة المستخدم

لا خطوة دخول. الرحلة: القائمة، إنشاء أو فتح ملف، تعبئة الأقسام، الحفظ عبر طلبات الواجهة، مشاهدة النتيجة في صفحة العرض، ثم التصدير. الأرشفة تغيّر `status` إلى `archived`.

## 8. الوحدات والأقسام

| القسم | الملفات | العمليات |
| --- | --- | --- |
| الأهداف | `backend/routes/targets.routes.js` و`js/targets.js` و`js/target-form.js` و`js/target-view.js` | قائمة، عرض، إنشاء، تعديل، صورة، حذف |
| الوثائق | `backend/routes/documents.routes.js` | قائمة، رفع، تنزيل، حذف |
| الملاحظات | `backend/routes/notes.routes.js` | قائمة، إنشاء، تعديل، حذف |
| الحسابات | `backend/routes/social.routes.js` | قائمة، إنشاء، تعديل، حذف |
| الخط الزمني | `backend/routes/timeline.routes.js` | قائمة، إنشاء، تعديل، حذف |
| البطاقات | `backend/routes/cards.routes.js` | قائمة، إنشاء، تعديل، حذف |
| التصدير | `backend/routes/export.routes.js` و`backend/utils/export-document.js` | قائمة وملف واحد |
| الصفحات | `pages/targets.html` و`target-new.html` و`target-view.html` و`target-edit.html` | الواجهة |
| القاعدة | `backend/db.js` | مجمع اتصالات |
| المساعدات | `backend/utils/helpers.js` | تواريخ، تهريب HTML، قص نص، روابط http، شركة الاتصالات |

## 9. الشركات والكيانات

كيان تشغيلي متعدد الشركات: «غير موجود في الملفات الحالية». حقل `companies_text` نص حر داخل ملف الهدف.

## 10. الصلاحيات

«غير موجود في الملفات الحالية». أي من يصل إلى المنفذ يصل إلى الواجهة البرمجية والملفات المرفوعة.

## 11. الأتمتة ومسارات العمل

مسارات موافقات: «غير موجود في الملفات الحالية».

الأتمتة الموجودة: حساب العمر، تنسيق التاريخ، واكتشاف شركة الاتصالات من بادئة الرقم الكويتي عند الحفظ. التصدير إلى PDF يشغّل Chromium عبر Puppeteer عند الطلب.

## 12. التكامل بين الوحدات

كل الجداول الفرعية ترتبط بـ `target_id` مع `ON DELETE CASCADE`. صفحة العرض تجمعها. التصدير يعيد تحميل الهدف والوثائق والملاحظات والحسابات والخط الزمني والبطاقات في `loadTargetBundle`. صورة الهدف تُخدم من `/uploads/` حسب `photo_path`.

## 13. المصطلحات

| المصطلح | المعنى |
| --- | --- |
| target | صف في `targets` |
| deleted_at | إخفاء منطقي |
| status | `active` أو `archived` |
| note_type | `note` أو `link` أو `investigation` |
| brand | علامة البطاقة، الافتراضي `unknown` |
| last_four | أربعة أرقام تُحفظ مع الرقم الكامل |

## 14. الأسئلة الشائعة

**هل يوجد دخول؟** «غير موجود في الملفات الحالية».

**أين الملفات؟** تحت `uploads/targets/<id>/`. الوثائق تحفظ اسماً مخزناً واسماً أصلياً ونوع MIME والحجم.

**ما صيغ التصدير؟** pdf وhtml وxlsx وdocx وtxt، وأي قيمة أخرى تذهب إلى csv.

**هل PDF يعمل بلا Chrome؟** عند الإقلاع تستدعي `checkChromeForPdf` وتطبع إن كان المسار جاهزاً أو أن تثبيت puppeteer يحمّل Chromium.

## 15. Architecture

```
+---------------- pages + css + js ----------------+
| targets / target-new / target-view / target-edit |
+------------------------+-------------------------+
                         | fetch /api
                         v
+---------------- Express server.js :3090 ---------+
| targets documents notes social timeline cards    |
| export                                           |
+----+---------------------------+-----------------+
     |                           |
     v                           v
 MySQL social_engineering     uploads/
```

## 16. Tech Stack

| الطبقة | التقنية |
| --- | --- |
| خادم | Node.js وExpress 4.18.2 |
| قاعدة | MySQL عبر mysql2 3.6.0 |
| بيئة | dotenv 16.3.1 |
| رفع | multer 1.4.5-lts.1 |
| PDF | puppeteer 25.0.4 وpuppeteer-core 25.0.4 |
| جداول | exceljs 4.3.0 |
| وورد | docx 8.2.2 |
| واجهة | HTML و`css/app.css` وJavaScript بلا إطار |
| خط | IBM Plex Sans Arabic في `assets/fonts/` |
| أيقونة | `assets/images/favicon.svg` مربوطة من الصفحات الأربع |

حقل `version` في `package.json` هو `1.0.0`. سكربت التطوير يستدعي `nodemon` وهذه الحزمة غير مذكورة في `dependencies`.

## 17. Project Structure

```
Social Engineering/
  server.js
  package.json
  .env.example
  backend/db.js
  backend/routes/
  backend/utils/
  database/schema.sql
  database/*.sql
  pages/
  js/
  css/
  assets/
  uploads/
```

ملفات SQL إضافية: `bank_cards.sql` و`alter_bank_cards_cvv.sql` و`alter_targets_full_edit.sql` و`alter_targets_phone_meta.sql` و`alter_targets_photo.sql` و`alter_targets_travels.sql`.

## 18. Frontend

اتجاه الصفحات عربي من اليمين. `js/targets.js` للقائمة، و`js/target-form.js` للنموذج، و`js/target-view.js` لصفحة العرض. البيانات تُطلب من `/api` بعد تحميل HTML. لا تطبيق صفحة واحدة. التصميم في `css/app.css`.

## 19. Backend

`server.js` يعطّل `x-powered-by`، يحد جسم JSON بـ 1 ميغابايت، ويضبط ثلاثة رؤوس أمان، ثم يركّب المسارات تحت `/api`. الاستعلامات في ملفات `routes` عبر مجمع `mysql2/promise` وعلامات `?`. المنطق المساعد في `helpers.js`. لا طبقة controllers منفصلة عن المسارات.

الاستماع على `0.0.0.0` والمنفذ `PORT` أو 3090.

## 20. Request Flow

مثال إنشاء هدف:

```
target-new.html
  -> POST /api/targets
  -> sanitizeText وparseId عند الحاجة
  -> INSERT في targets
  -> JSON
  -> الواجهة تفتح صفحة العرض
```

مثال تصدير:

```
GET /api/export/targets/:id?format=pdf
  -> SELECT للكتل
  -> HTML
  -> Puppeteer
  -> application/pdf
```

## 21. Database

| البند | القيمة |
| --- | --- |
| النوع | MySQL / InnoDB |
| الاسم | `social_engineering` من `DB_NAME` أو المخطط |
| الترميز | `utf8mb4` و`utf8mb4_unicode_ci` |
| الاتصال | مجمع في `backend/db.js`، الحد 10، المهلة 10000 |
| الاستعلامات | معاملات `?` |
| migrations | ملفات `database/alter_*.sql` تُنفَّذ يدوياً. أداة ترحيل آلية: «غير موجود في الملفات الحالية» |

| الجدول | العلاقة |
| --- | --- |
| `targets` | مفتاح `id`، فهارس الحالة والهوية والحذف |
| `documents` | `fk_documents_target` وحذف متسلسل |
| `notes` | `fk_notes_target` |
| `social_accounts` | `fk_social_target` |
| `timeline_events` | `fk_timeline_target` وفهرس `event_at` |
| `bank_cards` | `fk_bank_cards_target` |

أعمدة `bank_cards` تشمل `card_number` بطول 19 و`cvv` بطول 4 كنص في المخطط. لا دالة تشفير ظاهرة حول هذين العمودين.

بذور بيانات: «غير موجود في الملفات الحالية».

## 22. API

المصادقة على كل الصفوف: لا توجد.

| Method | Path | الغرض |
| --- | --- | --- |
| GET | `/api/targets` | القائمة |
| GET | `/api/targets/:id` | هدف واحد |
| POST | `/api/targets` | إنشاء |
| PUT | `/api/targets/:id` | تعديل |
| POST | `/api/targets/:id/photo` | صورة، الحقل `photo` |
| DELETE | `/api/targets/:id` | حذف منطقي |
| GET/POST | `/api/targets/:targetId/documents` | قائمة ورفع |
| GET | `/api/targets/:targetId/documents/:docId/download` | تنزيل |
| DELETE | `/api/targets/:targetId/documents/:docId` | حذف |
| GET/POST | `/api/targets/:targetId/notes` | ملاحظات |
| PUT/DELETE | `/api/targets/:targetId/notes/:noteId` | تعديل وحذف |
| GET/POST | `/api/targets/:targetId/social` | حسابات |
| PUT/DELETE | `/api/targets/:targetId/social/:accountId` | تعديل وحذف |
| GET/POST | `/api/targets/:targetId/timeline` | أحداث |
| PUT/DELETE | `/api/targets/:targetId/timeline/:eventId` | تعديل وحذف |
| GET/POST | `/api/targets/:targetId/cards` | بطاقات |
| PUT/DELETE | `/api/targets/:targetId/cards/:cardId` | تعديل وحذف |
| GET | `/api/export/targets` | تصدير القائمة، الوسيط `format` و`status` |
| GET | `/api/export/targets/:id` | تصدير ملف |

`GET /` يعيد تحويلاً إلى `/pages/targets.html`.

## 23. Authentication & Authorization

«غير موجود في الملفات الحالية». لا جلسة ولا رمز ولا وسيط تفويض في `server.js`.

## 24. Security

الموجود:

- استعلامات بمعاملات.
- تعطيل `X-Powered-By`.
- رؤوس `X-Content-Type-Options: nosniff` و`X-Frame-Options: DENY` و`Referrer-Policy: no-referrer`.
- حد جسم الطلب 1 ميغابايت.
- قائمة MIME للوثائق وللصور، وحد حجم.
- `parseId` يقبل أعداداً صحيحة موجبة.
- `sanitizeText` يقص النص.
- `escapeHtml` عند بناء مخرجات HTML للتصدير.
- `isSafeHttpUrl` للروابط.
- أسرار القاعدة من البيئة لا من قيم مثبتة في `server.js`.

غير الموجود في الملفات الحالية: تسجيل دخول، CSRF، تحديد معدل، تشفير أعمدة البطاقة، منع الوصول المباشر إلى `/uploads`.

رسائل 500 قد تعيد `e.message` في بعض مسارات التصدير.

مجلد `uploads/targets` يحتوي ملفات محلية على هذا الجهاز. لا تُنسخ محتوياتها إلى الوثائق ولا تُرفع علناً.

## 25. Configuration

أسماء `.env.example`:

| الاسم | الدور |
| --- | --- |
| `PORT` | المنفذ، المثال 3090 |
| `DB_HOST` | المضيف. القيمة `localhost` تُحوَّل إلى `127.0.0.1` |
| `DB_USER` | مستخدم القاعدة |
| `DB_PASSWORD` | كلمة مرور القاعدة |
| `DB_NAME` | الاسم، والمثال `social_engineering` |
| `UPLOAD_MAX_MB` | حد الوثائق، والمثال 20 |

القيمة الافتراضية في الكود لمستخدم القاعدة إذا خلا المتغير هي `root`.

## 26. Integrations

| الخدمة | الحالة |
| --- | --- |
| MySQL | مطلوبة |
| Chromium / Puppeteer | لتصدير PDF |
| خرائط | حقل `maps_url` يُخزَّن كنص. تكامل خرائط حي: «غير موجود في الملفات الحالية» |
| بريد أو SMS | «غير موجود في الملفات الحالية» |

## 27. Scheduled Jobs

«غير موجود في الملفات الحالية».

## 28. File Storage

`uploads/` للصور والوثائق. الصورة تُحفظ داخل `uploads/targets/<id>/` باسم `profile` وامتداد مسموح. الوثائق تحفظ اسماً مخزناً منفصلاً عن الاسم الأصلي. `.gitkeep` موجود في `uploads`. الملفات تُقدَّم بـ `express.static` على `/uploads`.

## 29. Logging & Monitoring

الأخطاء تُطبع بـ `console.error`. نظام مراقبة أو سجل تدقيق في جدول: «غير موجود في الملفات الحالية».

## 30. Installation

1. تثبيت Node.js وMySQL.
2. `npm install`.
3. نسخ `.env.example` إلى `.env` وتعبئة الاتصال. استخدم مستخدم قاعدة بصلاحيات محدودة على هذه القاعدة.
4. تنفيذ `database/schema.sql` ثم ملفات `alter_*.sql` إذا كانت القاعدة أقدم من المخطط الكامل.
5. `npm start`.
6. فتح `http://127.0.0.1:3090`.

## 31. Development Guide

صفحة جديدة تُوضع في `pages/` وتُخدم تلقائياً تحت `/pages`. مسار جديد يُضاف كملف في `backend/routes` ويُركَّب في `server.js` تحت `/api`. جدول جديد يحتاج SQL في `database/` واستعلامات بمعاملات. صلاحيات: لا بنية جاهزة، وإضافتها تبدأ بوسيط مصادقة غير موجود حالياً.

`npm run dev` يتوقع `nodemon` رغم غيابه من الاعتماديات المصرّح بها.

## 32. Deployment

الاستماع `0.0.0.0` والمنفذ من البيئة. ملفات Docker أو وكيل أو systemd: «غير موجود في الملفات الحالية». الإنتاج يحتاج HTTPS أمام العملية، ومستخدم MySQL غير إداري، وعدم نشر مجلد `uploads` ولا ملف `.env`.

## 33. Backup & Recovery

«غير موجود في الملفات الحالية». النسخ العملي هو تفريغ قاعدة `social_engineering` مع مجلد `uploads`.

## 34. Troubleshooting

| العرض | المصدر |
| --- | --- |
| فشل الاتصال بالقاعدة | قيم `DB_*` أو خدمة MySQL |
| PDF غير جاهز | رسالة `[chrome]` عند الإقلاع |
| رفض الصورة | النوع خارج JPG/PNG/WebP أو الحجم فوق 5 ميغابايت |
| رفض الوثيقة | MIME خارج القائمة أو الحجم فوق `UPLOAD_MAX_MB` |
| هدف غير ظاهر | `deleted_at` ليس فارغاً |
| `npm run dev` يفشل | `nodemon` غير مثبت |

## 35. Dependencies

من `package.json`: `docx` و`dotenv` و`exceljs` و`express` و`multer` و`mysql2` و`puppeteer` و`puppeteer-core` بالنطاقات المذكورة في الملف. `package-lock.json` يثبت الشجرة.

## 36. Known Limitations

- لا مصادقة على الواجهة ولا على الملفات المرفوعة.
- رقم البطاقة ورمز الأمان عمودان نصيان في المخطط.
- التصدير يقرأ أعمدة البطاقة كاملة عند بناء ملف الهدف.
- رسائل بعض الأخطاء تُرجع نص الاستثناء.
- المستخدم الافتراضي للقاعدة `root` إذا لم يُضبط `DB_USER`.
- ملفات الرفع المحلية موجودة على القرص ويجب إبقاؤها خارج أي نشر عام.

## 37. Current System State

| الحالة | البنود |
| --- | --- |
| موجود في الكود | الأهداف والأقسام الستة والتصدير والمخطط |
| موجود محلياً | `.env` ومجلد `uploads/targets` و`node_modules` |
| غير مكتمل | المصادقة، تشفير البطاقة، ترحيل آلي |
| غير موثق | جهة التصريح التشغيلية وسياسة الاحتفاظ |

## 38. Architecture Decisions

- MySQL لأن المخطط يصرّح بـ InnoDB وعلاقات صريحة.
- الحذف المنطقي للهدف والإبقاء على الحذف الفعلي للجداول الفرعية عند الطلب المباشر.
- التصدير يعيد بناء HTML ثم PDF حتى تشترك صيغة الشاشة والملف.
- قص النصوص وتهريب HTML في المساعدات قبل العرض والتصدير.
- تحويل `localhost` إلى `127.0.0.1` لتفادي اختلاف تعريف الاسم على الجهاز.

## 39. سجل التغييرات

سجل إصدارات مستقل: «غير موجود في الملفات الحالية». `package.json` يثبّت الإصدار `1.0.0`. ملفات `alter_*.sql` توثّق إضافات أعمدة لاحقة على المخطط الأولي: بيانات الجوال، الصورة، السفر، تعديل أوسع للهدف، وعمود مرتبط بالبطاقة.

## System Overview

```
[متصفح بلا دخول]
    -> [صفحات عربية]
    -> [Express /api]
         -> targets
         -> documents / notes / social / timeline / cards
         -> export -> PDF HTML XLSX DOCX TXT CSV
    -> [MySQL social_engineering]
    -> [uploads]
```

## Quick Reference

| الجزء | التقنية | الموقع | الوظيفة |
| --- | --- | --- | --- |
| خادم | Express | `server.js` | التوجيه والملفات |
| أهداف | mysql2 | `backend/routes/targets.routes.js` | السجل الرئيسي |
| وثائق | multer | `backend/routes/documents.routes.js` | الرفع |
| بطاقات | SQL | `database/schema.sql` | جدول `bank_cards` |
| تصدير | Puppeteer وExcelJS وdocx | `backend/utils/export-document.js` | الملفات |
| واجهة | HTML/JS | `pages/` و`js/` | الشاشات |
| اتصال | dotenv | `backend/db.js` | المجمّع |

## Quick Start

```
npm install
copy .env.example .env
npm start
```

نفّذ `database/schema.sql` على MySQL وعبّئ `.env` قبل فتح `http://127.0.0.1:3090`.

## For Non-Technical Users

هذا برنامج يحفظ ملفاً لكل شخص أو جهة تعمل عليها ضمن سياق مصرّح: الاسم ووسائل التواصل والملاحظات والوثائق والحسابات والأحداث. تفتح القائمة، تنشئ ملفاً، تملأ الأقسام، ثم تصدّر الملف PDF أو جدولاً. لا توجد شاشة دخول في النسخة الحالية، لذلك لا تترك البرنامج مفتوحاً على شبكة مشتركة.

أهم الشاشات: قائمة الملفات، ملف جديد، عرض الملف، تعديل الملف.

## For Developers

- التقنيات: Node.js وExpress وMySQL وMulter وPuppeteer.
- المعمارية: صفحات ثابتة ومسارات `/api` مجمّعة حول `targetId`.
- القاعدة: ستة جداول في `database/schema.sql`.
- API: بلا مصادقة حالياً.
- أهم الملفات: `server.js` و`backend/db.js` و`backend/routes/targets.routes.js` و`backend/utils/export-document.js` و`js/target-view.js`.
- التطوير: استعلامات بمعاملات، وأسرار في `.env`، وعدم طباعة أرقام بطاقات أو وثائق مرفوعة في السجلات.
