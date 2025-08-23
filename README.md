# IR CRM - Investor Relations Management System

한국어 전용 투자자 관계 관리 시스템입니다.

## 기능

- 국내/해외 투자자 관리
- 애널리스트 관리  
- 회사 및 펀드 관리
- 미팅 스케줄링 및 관리
- NDR/컨퍼런스 관리
- 문서 관리 (클라우드 스토리지)
- 이메일 캠페인
- 사용자 관리

## 설치 방법

### 1. 저장소 복제
```bash
git clone <your-repo-url>
cd <repo-name>
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.example` 파일을 복사하여 `.env` 파일을 만들고 필요한 값들을 설정하세요.

```bash
cp .env.example .env
```

### 4. 데이터베이스 설정
PostgreSQL 데이터베이스가 필요합니다. Neon Database 또는 로컬 PostgreSQL을 사용할 수 있습니다.

```bash
npm run db:push
```

### 5. 개발 서버 실행
```bash
npm run dev
```

서버가 `http://localhost:5000`에서 실행됩니다.

## 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
```

### 프로덕션 서버 시작
```bash
npm start
```

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI + shadcn/ui
- TanStack Query
- React Hook Form

### Backend  
- Node.js + Express
- TypeScript
- Drizzle ORM
- PostgreSQL

### 기타
- SendGrid (이메일)
- Replit Object Storage (파일 업로드)

## 환경 변수

다음 환경 변수들이 필요합니다:

- `DATABASE_URL` - PostgreSQL 연결 문자열
- `SENDGRID_API_KEY` (선택사항) - 이메일 기능용
- `PUBLIC_OBJECT_SEARCH_PATHS` (선택사항) - 오브젝트 스토리지용
- `PRIVATE_OBJECT_DIR` (선택사항) - 오브젝트 스토리지용

## 라이선스

MIT