const { createClient } = require('@supabase/supabase-js');

// Supabase 연결
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required.');
  console.error('Please set them in your .env file or environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// In-memory cache for faster reads
let cachedResponses = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5초 캐시

function generateId() {
  return 'r' + Date.now() + Math.random().toString(36).slice(2, 6);
}

async function loadResponses() {
  const now = Date.now();
  if (cachedResponses && (now - cacheTime) < CACHE_TTL) {
    return cachedResponses;
  }

  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('DB read error:', error.message);
    throw new Error('데이터 조회 실패: ' + error.message);
  }

  // DB 컬럼명 → 앱 형식으로 변환
  cachedResponses = (data || []).map(row => ({
    id: row.id,
    name: row.name,
    position: row.position || '',
    experience: row.experience || '',
    ratings: row.ratings || {},
    comments: row.comments || {},
    moduleComments: row.module_comments || {},
    overall: row.overall || {},
    timestamp: row.created_at
  }));
  cacheTime = now;
  return cachedResponses;
}

async function saveResponse(data) {
  const id = generateId();
  const row = {
    id,
    name: data.name || '',
    position: data.position || '',
    experience: data.experience || '',
    ratings: data.ratings || {},
    comments: data.comments || {},
    module_comments: data.moduleComments || {},
    overall: data.overall || {},
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('survey_responses')
    .insert(row);

  if (error) {
    console.error('DB write error:', error.message);
    throw new Error('저장 실패: ' + error.message);
  }

  // 캐시 무효화
  cachedResponses = null;
  console.log(`[DB] Response saved: ${id}`);
  return id;
}

async function getAllResponses() {
  const responses = await loadResponses();
  return [...responses].reverse(); // 최신순
}

async function getResponse(id) {
  const responses = await loadResponses();
  return responses.find(r => r.id === id) || null;
}

async function getStats() {
  const responses = await loadResponses();
  return {
    totalResponses: responses.length,
    latestResponse: responses.length > 0 ? responses[responses.length - 1].timestamp : null
  };
}

// ===== DRAFT (중간저장) =====

function generateResumeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

async function saveDraft(data) {
  let code = data.resumeCode;
  if (!code) {
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateResumeCode();
      const { data: existing } = await supabase
        .from('survey_drafts').select('resume_code').eq('resume_code', code).single();
      if (!existing) break;
      if (attempt === 4) throw new Error('코드 생성 실패');
    }
  }

  const row = {
    resume_code: code,
    step: data.step || 0,
    name: data.name || '',
    position: data.position || '',
    experience: data.experience || '',
    ratings: data.ratings || {},
    comments: data.comments || {},
    module_comments: data.moduleComments || {},
    overall: data.overall || {},
    disagree_types: data.disagreeTypes || {},
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('survey_drafts')
    .upsert(row, { onConflict: 'resume_code' });

  if (error) throw new Error('임시저장 실패: ' + error.message);
  console.log(`[DB] Draft saved: ${code}`);
  return code;
}

async function loadDraft(code) {
  const { data, error } = await supabase
    .from('survey_drafts')
    .select('*')
    .eq('resume_code', code.toUpperCase().trim())
    .single();

  if (error || !data) return null;

  return {
    resumeCode: data.resume_code,
    step: data.step,
    name: data.name || '',
    position: data.position || '',
    experience: data.experience || '',
    ratings: data.ratings || {},
    comments: data.comments || {},
    moduleComments: data.module_comments || {},
    overall: data.overall || {},
    disagreeTypes: data.disagree_types || {}
  };
}

async function deleteDraft(code) {
  await supabase.from('survey_drafts').delete().eq('resume_code', code);
}

module.exports = { saveResponse, getAllResponses, getResponse, getStats, saveDraft, loadDraft, deleteDraft };
