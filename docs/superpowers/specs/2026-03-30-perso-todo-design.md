# perso-todo 설계 문서

**날짜:** 2026-03-30
**상태:** 승인됨

---

## 개요

페르소나 기반 개인 투두 관리 데스크탑 앱. 사용자는 "직장인", "남편", "아들" 등 자신의 역할(페르소나)별로 할 일을 구분하여 관리한다. 매일 아침 지정 시간에 Windows 네이티브 알림과 Slack DM으로 오늘 할 일과 밀린 항목을 받는다.

---

## 플랫폼 및 스택

| 항목 | 결정 |
|---|---|
| 플랫폼 | Electron (Windows 타겟) |
| 프론트엔드 | React + Vite |
| 백엔드 | Express (Electron 메인 프로세스 내 실행) |
| DB | SQLite (better-sqlite3) |
| 알림 스케줄링 | node-cron |
| 빌드 | electron-builder |

---

## 아키텍처

```
perso-todo/
├── src/
│   ├── main/
│   │   ├── index.js         # Electron 진입점, BrowserWindow 관리
│   │   ├── server.js        # Express API 서버
│   │   ├── db.js            # SQLite 초기화 및 마이그레이션
│   │   ├── notify.js        # node-cron + 알림 발송 로직
│   │   └── tray.js          # 시스템 트레이 아이콘 및 메뉴
│   └── renderer/
│       ├── App.jsx
│       ├── main.jsx
│       └── components/
│           ├── Sidebar.jsx
│           ├── TodoList.jsx
│           ├── TodoItem.jsx
│           ├── TodoForm.jsx
│           ├── WeekView.jsx
│           ├── MonthView.jsx
│           └── Settings.jsx
├── docs/
├── electron-builder.json
└── package.json
```

**실행 흐름:**
1. Electron 시작 → `main/index.js`가 Express 서버 시작 (`server.js`)
2. BrowserWindow에 React 앱 로드 (`localhost:3001` 개발 / 빌드 파일 프로덕션)
3. 창 닫기 시 앱 종료 대신 시스템 트레이로 최소화
4. node-cron이 설정된 시간에 알림 발송

**데이터 저장 위치:** `%APPDATA%/perso-todo/todos.db`

---

## 데이터 모델

```sql
CREATE TABLE personas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL,      -- hex color, e.g. "#89b4fa"
  icon       TEXT,               -- 이모지, nullable
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE todos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT NOT NULL,
  memo         TEXT,
  due_date     TEXT,             -- ISO 8601: "2026-03-31"
  persona_id   INTEGER REFERENCES personas(id) ON DELETE SET NULL,
  completed    INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- 사용하는 key:
-- "notify_time"       → "08:00" (HH:MM 24시간제)
-- "slack_webhook_url" → Slack Incoming Webhook URL
```

---

## REST API

```
# 투두
GET    /api/todos              ?from=YYYY-MM-DD &to=YYYY-MM-DD &persona_id=1
                               # 오늘: from=today&to=today
                               # 이번 주: from=월요일&to=일요일
                               # 월간: from=1일&to=말일
POST   /api/todos
PATCH  /api/todos/:id
DELETE /api/todos/:id

# 페르소나
GET    /api/personas
POST   /api/personas
PATCH  /api/personas/:id
DELETE /api/personas/:id

# 설정
GET    /api/settings
PATCH  /api/settings
```

---

## 화면 구성

### 공통 레이아웃 — 사이드바
왼쪽 사이드바에 두 개의 섹션:
1. **뷰 네비게이션**: 오늘 / 이번 주 / 월간
2. **페르소나 필터**: 전체 + 각 페르소나 (색상 dot + 이름)
3. 하단에 설정 링크

### ① 오늘 뷰 (기본 화면)
- 헤더: "오늘 · M월 D일"
- 투두 리스트: 미완료 → 완료 순 정렬
- 각 투두 아이템: 체크박스 + 제목 + 페르소나 색상 + 마감일
- 우상단 "+ 추가" 버튼 → 투두 생성 모달
- 페르소나 사이드바 클릭 시 해당 페르소나 투두만 필터링

### ② 이번 주 뷰
- 상단: 해당 주 월~일 날짜 표시, 오늘 강조
- 각 날짜에 투두 dot (페르소나 색상)
- 날짜 클릭 시 해당 날짜 투두 리스트 하단에 표시

### ③ 월간 뷰
- 달력 형태, 이전/다음 월 이동
- 각 날짜에 투두 dot (페르소나 색상별)
- 날짜 클릭 시 해당 날짜 투두 리스트 표시

### ④ 설정 화면
- **알림 섹션**: 알림 시간 입력 (HH:MM), Slack Webhook URL 입력
- **페르소나 관리**: 추가 / 이름·색상 수정 / 삭제 (삭제 시 해당 페르소나의 투두는 페르소나 없음으로 변경)

### 투두 생성/편집 폼
필드: 제목(필수), 마감일, 페르소나 선택, 메모

---

## 알림 시스템

### 발송 조건
- 매일 설정된 시간에 node-cron 발동
- 오늘 마감인 미완료 투두
- 오늘 이전 마감인 미완료 투두 (밀린 항목)

### Windows 네이티브 알림
- Electron의 `Notification` API 사용
- 제목: "오늘의 할 일 (M월 D일)"
- 본문: 투두 개수 요약 (상세 내용은 Slack에서 확인)

### Slack 메시지 형식
```
📋 오늘의 할 일 (3월 30일)

오늘 마감
• [직장인] 보고서 작성
• [남편] 꽃 사기

밀린 항목
• [아들] 병원 예약 전화 (3/28 마감)
```

### 예외 처리
- Slack Webhook URL 미설정 시 Slack 알림 스킵 (에러 없음)
- 알림 시간 변경 시 기존 cron 해제 후 즉시 재등록
- 앱이 트레이에 최소화된 상태에서도 알림 정상 발송

---

## 시스템 트레이

- 트레이 아이콘 항상 표시
- 우클릭 메뉴: "열기 / 종료"
- 창 닫기(X) 클릭 시 종료가 아닌 트레이로 최소화
- 앱 완전 종료는 트레이 메뉴 "종료"로만 가능

---

## 범위 외 (v1 미포함)

- 투두 공유 / 협업
- 반복 투두
- 하위 태스크
- 우선순위 필드
- 클라우드 동기화
- 모바일 앱
