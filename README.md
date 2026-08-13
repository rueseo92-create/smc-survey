# SMC 소아응급실 퇴원교육 — 전문가 설문 시스템

## 프로젝트 개요
삼성서울병원(SMC) 소아응급실 퇴원교육 모듈 콘텐츠의 적절성을 소아응급의학 전문가가 평가하는 웹 설문 시스템.

- 23개 모듈, 272개 문항 (보호자 친화적 톤)
- 동의/비동의 방식 평가
- 비동의 시 수정 의견 또는 삭제 선택
- 관리자 대시보드 (CSV/JSON 다운로드)
- 데이터 영구 보존 (JSON 파일 + 개별 백업)

## 빠른 시작

```bash
npm install
node server.js
```

- 설문 페이지: http://localhost:3000
- 관리자: http://localhost:3000/admin
- 관리자 비번: `0000`

## 디렉토리 구조

```
smc-survey-project/
├── README.md
├── package.json
├── server.js          ← Express 서버 + REST API
├── db.js              ← JSON 파일 기반 DB (자동 백업)
├── public/
│   ├── index.html     ← 설문 페이지 (프론트엔드)
│   ├── admin.html     ← 관리자 대시보드
│   └── mentoring.html ← AI 리버스 멘토링 (별도 설문, /mentoring)
└── data/              ← 자동 생성
    ├── responses.json     ← 전체 응답 데이터
    ├── responses.json.bak ← 자동 백업
    └── resp_r*.json       ← 개별 응답 백업
```

## API

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/responses` | 설문 응답 제출 |
| GET | `/api/responses` | 전체 응답 조회 |
| GET | `/api/responses/:id` | 개별 응답 조회 |
| GET | `/api/responses/export/csv` | CSV 다운로드 |
| GET | `/api/responses/export/json` | JSON 다운로드 |
| GET | `/api/mentoring/store` | 리버스 멘토링 전체 응답 조회 |
| POST | `/api/mentoring/store` | 리버스 멘토링 응답 저장 (`{key, value}`) |
| POST | `/api/admin/login` | 관리자 로그인 |
| GET | `/api/stats` | 통계 |

## AI 리버스 멘토링 설문 (`/mentoring`)

기존 전문가 설문과 완전히 분리된 두 번째 설문입니다.

- 페이지: `public/mentoring.html` (단일 파일 앱)
- 주소: `/mentoring`
- 저장: Supabase `mentoring_store` 테이블 (key-value). 기존 `survey_responses`와 무관
- 멘토 화면: 앱 하단 **멘토 보기** — 두 멘티의 응답과 실기 평가 확인

**주의: 이 설문에는 로그인이 없습니다.** 주소를 아는 사람은 멘토 화면까지 볼 수 있습니다.
공개 범위를 제한해야 한다면 별도 인증을 추가해야 합니다.

## 데이터 안전성
- `data/responses.json`에 전체 데이터 저장
- 매 저장 시 `.bak` 자동 백업
- 개별 응답마다 `resp_r*.json` 별도 저장 (3중 보존)
- DELETE API 없음 — 삭제 코드 없음
- 서버 재시작해도 데이터 유지

## 환경 변수
- `PORT`: 서버 포트 (기본 3000)
- `ADMIN_PW`: 관리자 비밀번호 (기본 0000)

## 배포
외부 서버에 배포 시:
```bash
# PM2 사용
npm install -g pm2
pm2 start server.js --name smc-survey

# 또는 systemd, Docker 등
PORT=80 node server.js
```
