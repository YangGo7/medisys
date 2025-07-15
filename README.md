# LaCID
## Lung Anomaly Clinical Intelligence Decision-support

> 임상의를 위한 차세대 통합 AI 의료 플랫폼

### 프로젝트 개요
LaCID는 의료 영상 분석과 임상 의사결정을 지원하는 All-in-One Clinical Decision Support Platform입니다. 폐 질환 진단을 위한 X-ray 영상 분석, 혈액 검사 결과 해석, 실시간 협업 도구를 하나의 통합 시스템으로 제공합니다.

### 주요 기능

#### PACS/RIS 시스템
- **영상 검사 스케줄링**: 드래그 앤 드롭 기반 직관적인 검사 배정
- **AI 기반 영상 분석**: 흉부 X-ray에서 12가지 비정상 소견 자동 탐지
- **실시간 영상 뷰어**: SVG + CSS 기반 전용 뷰어와 측정 도구
- **자동 판독 지원**: STT 기반 음성 판독문 자동 텍스트 변환
- **문서 자동 생성**: AI 분석 결과 기반 진단서 및 보고서 자동 작성

#### LIS 시스템  
- **혈액 검사 분석**: 머신러닝 기반 질병 위험도 예측
- **대화형 시뮬레이션**: 슬라이더를 통한 검사 수치 조정 및 실시간 예측
- **해석 가능한 AI**: SHAP 기반 예측 근거 시각화

#### 실시간 협업
- **WebSocket 채팅**: 의료진 간 실시간 소통
- **케이스 공유**: 영상 및 검사 결과 즉시 공유

### 기술 스택

#### Frontend & Backend
- **React**: 사용자 인터페이스
- **Django**: 백엔드 API 서버
- **Flask**: AI 모델 서빙
- **Node.js**: 실시간 메신저 서버

#### Database & Middleware
- **MySQL**: 메인 데이터베이스
- **PostgreSQL**: PACS 데이터 저장
- **Redis**: 캐싱 및 작업 큐
- **NGinX**: 리버스 프록시
- **Celery**: 비동기 작업 처리

#### AI & ML
- **PyTorch**: 딥러닝 프레임워크
- **Ultralytics (YOLO)**: 객체 탐지
- **Pandas**: 데이터 분석
- **Scikit-learn**: 머신러닝

#### Infrastructure
- **Docker**: 컨테이너 오케스트레이션
- **Google Cloud Platform**: 클라우드 배포
- **GitHub**: 버전 관리

### 시스템 아키텍처

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │────│    NGinX    │────│   Backend   │
│   (React)   │    │  (Proxy)    │    │  (Django)   │
└─────────────┘    └─────────────┘    └─────────────┘
                            │                  │
                   ┌─────────────┐    ┌─────────────┐
                   │ PACS Server │    │ AI Service  │
                   │ (Orthanc)   │    │  (Flask)    │
                   └─────────────┘    └─────────────┘
                            │                  │
                   ┌─────────────┐    ┌─────────────┐
                   │PostgreSQL   │    │   Redis     │
                   │             │    │ (Celery)    │
                   └─────────────┘    └─────────────┘
```

### 설치 및 실행

#### 필수 요구사항
- Docker 20.10+
- Docker Compose 2.0+
- Git

#### 설치 방법

1. **저장소 클론**
```bash
git clone https://github.com/your-username/lacid.git
cd lacid
```

2. **Docker 컨테이너 실행**
```bash
# 전체 시스템 시작
docker-compose up -d

# 개별 서비스 실행
docker-compose up orthanc ai-service -d
```

3. **서비스 접속**
- **PACS 뷰어**: http://localhost:8042
- **메인 애플리케이션**: http://localhost:3000
- **AI 서비스**: http://localhost:5000
- **관리자 패널**: http://localhost:8080

#### 환경 설정

```bash
# 환경 변수 설정
cp .env.example .env

# 필요한 경우 환경 변수 수정
vim .env
```

### AI 모델

#### 1. 객체 탐지 모델 (YOLO/SSD)
- **목적**: 흉부 X-ray에서 12가지 비정상 소견 탐지
- **모델**: YOLOv8, SSD300
- **성능**: 
  - YOLOv8: Precision 0.710, Recall 0.058
  - SSD: Precision 0.973, Recall 0.060

#### 2. 이상 탐지 모델 (SimCLR)
- **목적**: 무라벨 학습을 통한 폐 이상 탐지
- **아키텍처**: PatchSimCLR 기반 Contrast Learning
- **성능**: Normal Images Accuracy 0.720, Average IoU 0.650

#### 3. 머신러닝 모델 (앙상블)
- **목적**: 혈액 검사 기반 폐질환 위험도 예측
- **모델**: XGBoost, LightGBM, Random Forest 앙상블
- **대상 질환**: COPD, 천식, 폐색전증, 울혈성심부전
- **성능**: AUC 0.82 (COPD), 0.97 (천식)

### 개발 환경 설정

#### Backend 개발
```bash
# Python 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# Django 서버 실행
python manage.py runserver
```

#### Frontend 개발
```bash
cd frontend
npm install
npm start
```

#### AI 서비스 개발
```bash
cd docker-compose
docker build -f Dockerfile.ai -t lacid-ai .
docker run -p 5000:5000 lacid-ai
```

### 프로젝트 구조

```
lacid/
├── frontend/                 # React 프론트엔드
├── backend/                  # Django 백엔드
├── pacsapp/                  # PACS 앱 & 실시간 메신저
├── docker-compose/           # Docker 설정
│   ├── Dockerfile
│   ├── Dockerfile.ai
│   └── docker-compose.yml
├── scripts/                  # AI 모델 스크립트
├── models/                   # 사전 훈련된 모델
├── lua-scripts/              # Orthanc Lua 스크립트
└── README.md
```

### 시연 영상(임시) https://youtu.be/e_5U5SGQKi4

#### 1. 영상 업로드 및 분석
1. PACS 시스템에 DICOM 파일 업로드
2. AI 모델이 자동으로 분석 시작
3. 결과를 뷰어에서 확인

#### 2. 혈액 검사 분석
1. LIS 시스템에서 검사 데이터 입력
2. 슬라이더로 수치 조정하여 시뮬레이션
3. SHAP 차트로 예측 근거 확인

#### 3. 실시간 협업
1. 채팅 시스템으로 팀원과 소통
2. 케이스 공유 및 협진
3. 자동 문서 생성


**LaCID Team** - *임상의를 위한 AI 기반 의료 플랫폼*
