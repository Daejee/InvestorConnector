# 배포 가이드

## GitHub에서 Clone 후 배포하기

### 1. 클라우드 플랫폼 배포

#### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 배포
vercel

# 환경 변수 설정
vercel env add DATABASE_URL
```

#### Railway 배포
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인 및 배포
railway login
railway link
railway up
```

### 2. 데이터베이스 설정

#### Neon Database (추천)
1. [Neon Console](https://console.neon.tech)에서 새 프로젝트 생성
2. 연결 문자열 복사
3. 환경 변수 `DATABASE_URL` 설정
4. `npm run db:push` 실행

#### Supabase
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Settings > Database에서 연결 문자열 확인
3. 환경 변수 설정 후 마이그레이션 실행

### 3. 환경 변수 설정

배포 플랫폼에서 다음 환경 변수들을 설정하세요:

**필수:**
- `DATABASE_URL`

**선택사항:**
- `SENDGRID_API_KEY` (이메일 기능)
- `NODE_ENV=production`

### 4. 빌드 명령어

대부분의 플랫폼에서 자동으로 감지되지만, 수동 설정이 필요한 경우:

**빌드 명령어:** `npm run build`
**시작 명령어:** `npm start`
**개발 명령어:** `npm run dev`

### 5. 포트 설정

애플리케이션은 환경 변수 `PORT` 또는 기본값 5000을 사용합니다.
클라우드 플랫폼에서는 자동으로 포트가 할당됩니다.

### 6. 파일 업로드 기능

파일 업로드 기능을 사용하려면 오브젝트 스토리지 설정이 필요합니다:
- Replit Object Storage (Replit 환경에서만)
- AWS S3
- Google Cloud Storage
- 기타 호환 스토리지

### 7. 문제 해결

#### 데이터베이스 연결 오류
- `DATABASE_URL` 환경 변수 확인
- 데이터베이스 서버 상태 확인
- 방화벽 설정 확인

#### 빌드 오류
- Node.js 버전 확인 (18.0.0 이상 권장)
- `npm install` 재실행
- 캐시 클리어: `npm run clean` (있는 경우)

#### 이메일 기능 안됨
- `SENDGRID_API_KEY` 설정 확인
- SendGrid 계정 상태 확인
- 이메일 템플릿 설정 확인