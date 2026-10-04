require('dotenv').config();
const path = require('path');
const express = require('express');

const targetsRoutes = require('./backend/routes/targets.routes');
const documentsRoutes = require('./backend/routes/documents.routes');
const notesRoutes = require('./backend/routes/notes.routes');
const socialRoutes = require('./backend/routes/social.routes');
const timelineRoutes = require('./backend/routes/timeline.routes');
const cardsRoutes = require('./backend/routes/cards.routes');
const exportRoutes = require('./backend/routes/export.routes');
const { checkChromeForPdf } = require('./backend/utils/export-document');

const app = express();
const PORT = Number(process.env.PORT) || 3090;

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const api = express.Router();
api.use('/targets', targetsRoutes);
api.use('/targets/:targetId/documents', documentsRoutes);
api.use('/targets/:targetId/notes', notesRoutes);
api.use('/targets/:targetId/social', socialRoutes);
api.use('/targets/:targetId/timeline', timelineRoutes);
api.use('/targets/:targetId/cards', cardsRoutes);
api.use('/export', exportRoutes);
app.use('/api', api);

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));

app.get('/', (req, res) => {
  res.redirect('/pages/targets.html');
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Social Engineering dossiers on http://127.0.0.1:${PORT}`);
  try {
    const c = await checkChromeForPdf();
    if (c.ok) console.log('[chrome] PDF جاهز:', c.path);
    else console.warn('[chrome] غير جاهز — تثبيت puppeteer يحمّل Chromium للتصدير PDF');
  } catch (e) {
    console.warn('[chrome]', e.message);
  }
});
