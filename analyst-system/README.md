# 애널리스트 분석 시스템 (독립형)

이 시스템은 애널리스트 리포트 관리 및 AI 종합 분석 기능을 제공하는 독립형 웹 애플리케이션입니다.

## 주요 기능

- ✅ **PDF 파일 업로드**: 애널리스트 리포트 PDF 파일을 클라우드에 업로드
- ✅ **수동 분석 입력**: 긍정적 요인, 우려사항, 목표주가 수동 입력
- ✅ **AI 종합 분석**: OpenAI GPT-4o를 사용한 다중 리포트 종합 분석
- ✅ **애널리스트 관리**: 애널리스트 정보 및 소속 증권사 관리
- ✅ **검색 및 필터**: 리포트 제목, 애널리스트명, 증권사로 검색
- ✅ **PDF/DOC 내보내기**: 분석 결과를 전문적인 비즈니스 리포트로 출력

## 시스템 요구사항

### 환경 변수
다음 환경 변수들을 설정해야 합니다:

```bash
# 데이터베이스 (PostgreSQL)
DATABASE_URL=postgresql://username:password@localhost:5432/dbname

# OpenAI API (종합 분석용)
OPENAI_API_KEY=sk-...

# Replit Object Storage (파일 업로드용)
REPLIT_BUCKET_NAME=your-bucket-name
```

### 데이터베이스 스키마
시스템은 다음 테이블들을 사용합니다:
- `organizations`: 조직 정보
- `analysts`: 애널리스트 정보
- `analystReports`: 업로드된 리포트 및 분석 데이터

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 데이터베이스 초기화
```bash
npm run db:push
```

### 3. 개발 서버 실행
```bash
npm run dev
```
- 백엔드: http://localhost:5000
- 프론트엔드: http://localhost:3000

### 4. 프로덕션 빌드
```bash
npm run build
npm run start
```

## 프로젝트 구조

```
analyst-system/
├── client/                # React 프론트엔드
│   ├── src/
│   │   ├── components/ui/ # UI 컴포넌트 (shadcn/ui)
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── lib/           # 유틸리티 및 설정
│   │   └── hooks/         # React 훅
│   └── index.html
├── server/                # Express 백엔드
│   ├── aiAnalysisService.ts  # AI 분석 서비스
│   ├── objectStorage.ts     # 파일 스토리지 서비스
│   ├── storage.ts           # 데이터베이스 레이어
│   ├── routes.ts            # API 라우트
│   └── index.ts             # 서버 진입점
├── shared/
│   └── schema.ts           # 공유 데이터 스키마
└── package.json
```

## API 엔드포인트

### 애널리스트 관리
- `GET /api/analysts` - 애널리스트 목록 조회
- `POST /api/analysts` - 애널리스트 생성
- `PATCH /api/analysts/:id` - 애널리스트 수정
- `DELETE /api/analysts/:id` - 애널리스트 삭제

### 리포트 관리
- `GET /api/analyst-reports` - 리포트 목록 조회
- `POST /api/analyst-reports` - 리포트 생성
- `PATCH /api/analyst-reports/:id` - 리포트 수정
- `DELETE /api/analyst-reports/:id` - 리포트 삭제

### 파일 업로드
- `POST /api/objects/upload` - 업로드 URL 생성

### AI 분석
- `POST /api/comprehensive-analysis` - 종합 분석 실행

## 기술 스택

### 프론트엔드
- **React 18** + TypeScript
- **TanStack Query** (상태 관리)
- **Tailwind CSS** + **shadcn/ui** (스타일링)
- **React Hook Form** + **Zod** (폼 처리)
- **Vite** (빌드 도구)

### 백엔드
- **Node.js** + **Express.js** + TypeScript
- **Drizzle ORM** + **PostgreSQL** (데이터베이스)
- **OpenAI API** (AI 분석)
- **Google Cloud Storage** (파일 저장)

## 주요 특징

### 1. 실제 데이터 중심 접근
- 가짜 데이터 생성 방지
- 수동 입력으로 정확한 분석 보장
- PDF 자동 파싱 없음으로 오류 방지

### 2. AI 종합 분석
- OpenAI GPT-4o 모델 사용
- 다중 리포트 통합 분석
- 4개 섹션 구성 (요약, 긍정요인, 우려사항, 목표주가)

### 3. 전문적인 UI/UX
- 한국어 전용 인터페이스
- 직관적인 리포트 관리
- 실시간 검색 및 필터링

### 4. 확장 가능한 아키텍처
- TypeScript 타입 안전성
- 모듈화된 서비스 구조
- RESTful API 설계

## 문제 해결

### 일반적인 오류들
1. **DATABASE_URL 오류**: PostgreSQL 연결 문자열 확인
2. **OPENAI_API_KEY 오류**: OpenAI API 키 유효성 확인
3. **파일 업로드 실패**: Object Storage 권한 및 버킷 이름 확인

### 개발 팁
- `npm run check`로 타입 검사
- `npm run db:push`로 스키마 동기화
- 브라우저 개발자 도구에서 네트워크 탭 확인

## 라이선스
MIT