-- SMC 소아응급실 퇴원교육 전문가 설문 시스템 - Supabase 스키마
-- Supabase SQL Editor에서 이 스크립트를 실행하세요.

CREATE TABLE IF NOT EXISTS survey_responses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT DEFAULT '',
  experience TEXT DEFAULT '',
  ratings JSONB DEFAULT '{}',
  comments JSONB DEFAULT '{}',
  module_comments JSONB DEFAULT '{}',
  overall JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 읽기/쓰기 정책: anon key로 접근 가능하도록 설정
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- 누구나 설문 제출 가능 (INSERT)
CREATE POLICY "Anyone can insert responses"
  ON survey_responses FOR INSERT
  TO anon
  WITH CHECK (true);

-- 누구나 조회 가능 (관리자 페이지용 - 비밀번호로 보호됨)
CREATE POLICY "Anyone can read responses"
  ON survey_responses FOR SELECT
  TO anon
  USING (true);

-- 인덱스: 최신순 조회 최적화
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON survey_responses(created_at DESC);

-- ===== 중간저장 (Drafts) 테이블 =====
CREATE TABLE IF NOT EXISTS survey_drafts (
  resume_code TEXT PRIMARY KEY,
  step INTEGER NOT NULL DEFAULT 0,
  name TEXT DEFAULT '',
  position TEXT DEFAULT '',
  experience TEXT DEFAULT '',
  ratings JSONB DEFAULT '{}',
  comments JSONB DEFAULT '{}',
  module_comments JSONB DEFAULT '{}',
  overall JSONB DEFAULT '{}',
  disagree_types JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE survey_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert drafts"
  ON survey_drafts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can read drafts"
  ON survey_drafts FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can update drafts"
  ON survey_drafts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete drafts"
  ON survey_drafts FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON survey_drafts(updated_at DESC);
