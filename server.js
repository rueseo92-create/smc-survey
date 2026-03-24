require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { saveResponse, getAllResponses, getResponse, getStats } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PW || '0000';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== SURVEY API =====

// Submit response
app.post('/api/responses', async (req, res) => {
  try {
    const { name, position, experience, ratings, comments, moduleComments, overall } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '성명을 입력해주세요.' });
    }
    const id = await saveResponse({ name, position, experience, ratings, comments, moduleComments, overall });
    console.log(`[${new Date().toISOString()}] New response: ${id} by ${name}`);
    res.json({ success: true, id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: '저장 중 오류가 발생했습니다.' });
  }
});

// ===== ADMIN API =====

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
});

// IMPORTANT: Export routes MUST be defined BEFORE the :id route
// Otherwise Express matches "export" as an :id parameter

// Export CSV
app.get('/api/responses/export/csv', async (req, res) => {
  try {
    const responses = await getAllResponses();
    const MODULES = getModuleIds();

    const headers = ['ID', '응답자명', '직책', '경력', '작성일시'];
    MODULES.forEach(mid => {
      for (let i = 0; i < 30; i++) headers.push(`${mid}-${i + 1}_동의여부`);
    });
    MODULES.forEach(mid => {
      for (let i = 0; i < 30; i++) headers.push(`${mid}-${i + 1}_의견`);
    });
    MODULES.forEach(mid => headers.push(`${mid}_전체의견`));
    for (let i = 0; i < 6; i++) headers.push(`종합${i + 1}`);

    const rows = [headers.join(',')];
    responses.forEach(r => {
      const row = [q(r.id), q(r.name), q(r.position), q(r.experience), q(r.timestamp)];
      MODULES.forEach(mid => {
        for (let i = 0; i < 30; i++) {
          const v = r.ratings?.[mid]?.[i];
          row.push(v === 1 ? '동의' : v === 2 ? '비동의' : '');
        }
      });
      MODULES.forEach(mid => {
        for (let i = 0; i < 30; i++) row.push(q(r.comments?.[mid]?.[i] || ''));
      });
      MODULES.forEach(mid => row.push(q(r.moduleComments?.[mid] || '')));
      for (let i = 0; i < 6; i++) row.push(q(r.overall?.[i] || ''));
      rows.push(row.join(','));
    });

    const csv = '\uFEFF' + rows.join('\n');
    const filename = `SMC_설문응답_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ error: 'CSV 생성 중 오류가 발생했습니다.' });
  }
});

// Export JSON
app.get('/api/responses/export/json', async (req, res) => {
  try {
    const responses = await getAllResponses();
    const filename = `SMC_설문응답_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.json(responses);
  } catch (err) {
    res.status(500).json({ error: 'JSON 생성 중 오류가 발생했습니다.' });
  }
});

// Get all responses (admin)
app.get('/api/responses', async (req, res) => {
  try {
    const responses = await getAllResponses();
    res.json(responses);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
  }
});

// Get single response (MUST be after /export routes)
app.get('/api/responses/:id', async (req, res) => {
  try {
    const response = await getResponse(req.params.id);
    if (!response) return res.status(404).json({ error: '응답을 찾을 수 없습니다.' });
    res.json(response);
  } catch (err) {
    res.status(500).json({ error: '데이터 조회 중 오류가 발생했습니다.' });
  }
});

// Stats
app.get('/api/stats', async (req, res) => {
  try {
    res.json(await getStats());
  } catch (err) {
    res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
});

// SPA fallback
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Helpers
function q(s) { return `"${String(s || '').replace(/"/g, '""')}"`; }
function getModuleIds() {
  return ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W'];
}

// Vercel: export app for serverless
module.exports = app;

// Local dev: listen on port
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║  SMC 소아응급 퇴원교육 설문 시스템       ║
  ║  ────────────────────────────────────   ║
  ║  설문 페이지:  http://localhost:${PORT}      ║
  ║  관리자:       http://localhost:${PORT}/admin ║
  ║  관리자 비번:  ${ADMIN_PASSWORD}                      ║
  ║  DB: Supabase PostgreSQL (Cloud)        ║
  ╚══════════════════════════════════════════╝
    `);
  });
}
