# IR CRM - Electron Desktop Application

IR CRM을 Windows .exe 파일로 패키징하는 방법입니다.

## 빌드 환경 요구사항

- Windows 10/11 또는 Windows용 Docker
- Node.js 18 이상
- Git

## 빌드 과정

### 1. 프로젝트 다운로드
```bash
git clone <your-repository-url>
cd ir-crm
npm install
```

### 2. 웹 애플리케이션 빌드
```bash
npm run build
```

### 3. Electron 앱 빌드
```bash
npx electron-builder --win
```

또는 빌드 스크립트 사용:
```bash
chmod +x build-electron.sh
./build-electron.sh
```

## 빌드 결과

- `electron-dist/` 폴더에 생성됩니다
- `IR CRM Setup 1.0.0.exe` - Windows 설치 파일
- 크기: 약 150-200MB
- 독립 실행 가능 (Node.js 설치 불필요)

## 앱 특징

✅ **독립 실행**: 별도 프로그램 설치 없이 실행
✅ **자동 서버**: 내장 웹 서버 자동 시작
✅ **데스크톱 통합**: 바탕화면 바로가기, 시작메뉴 등록
✅ **메뉴바 제거**: 깔끔한 앱 모양
✅ **PostgreSQL 연결**: 기존 데이터베이스 사용

## 배포 가능한 파일들

1. **설치 파일**: `IR CRM Setup 1.0.0.exe` (최종 사용자용)
2. **포터블 버전**: `IR CRM-1.0.0.exe` (압축 해제 후 실행)

## 윈도우 환경에서 테스트

Windows PC에서 다음 명령어로 테스트:
```bash
npm run electron
```

## 라이센스 및 배포

- 상업적 배포 가능
- 디지털 서명 추가 권장 (Windows Defender 경고 방지)
- 버전 관리는 package.json의 version 필드에서 수정

## 문제 해결

### 빌드 오류 시
1. Node.js 버전 확인 (18+ 필요)
2. Windows Defender 실시간 보호 일시 해제
3. 관리자 권한으로 cmd 실행

### 실행 오류 시
1. 방화벽에서 5000 포트 허용
2. PostgreSQL 연결 정보 확인
3. 환경변수 DATABASE_URL 설정

## 업데이트 방법

새 버전 배포 시:
1. package.json의 version 업데이트
2. 새로 빌드
3. 기존 앱 제거 후 새 설치파일 실행