# LaCID (Lung Cancer Intelligence Detection)

**AI 기반 흉부 이상 탐지 및 병원 관리 시스템**

LaCID는 딥러닝 기술을 활용한 흉부 X-ray 영상 분석과 음성 인식 기반 진료 기록 시스템을 통합한 스마트 병원 관리 솔루션입니다.




## 🎯 주요 기능

### 🔍 흉부 병변 자동 탐지
- **YOLO 기반 실시간 객체 탐지**: 흉부 X-ray에서 이상 소견 실시간 식별
- **SSD(Single Shot MultiBox Detector)**: 다중 스케일 병변 탐지
- **SimCLR 기반 자기지도학습**: 레이블 없는 데이터로 성능 향상

### 🎤 음성 인식 진료 기록 (STT)
- 실시간 음성-텍스트 변환으로 진료 효율성 극대화
- 의료 전문 용어 인식 최적화
- 자동 진료 기록 생성 및 정리

### 🏥 LIS 기반 자동 분석
- Laboratory Information System 연동
- 검사 결과 자동 분석 및 해석
- 진단 보조 리포트 생성

## 🏗️ 시스템 아키텍처

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   프론트엔드    │    │    백엔드 API   │    │   AI 모델 서버  │
│   (의사/관리자) │◄──►│   (진료기록)    │◄──►│   (이미지분석)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   STT 엔진      │    │   데이터베이스  │    │   모델 저장소   │
│   (음성인식)    │    │   (환자/진료)   │    │ (YOLO/SSD/CLR)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 설치 및 실행

### 필수 요구사항
- Python 3.8+
- CUDA 11.0+ (GPU 가속을 위한 선택사항)
- Docker (권장)
- 최소 8GB RAM, 16GB 권장

### 1. 저장소 클론
```bash
git clone https://github.com/YangGo7/medisys.git
cd medisys
```

### 2. 가상환경 설정
```bash
python -m venv lacid_env
source lacid_env/bin/activate  # Windows: lacid_env\Scripts\activate
```

### 3. 의존성 설치
```bash
pip install -r requirements.txt
```

### 4. 환경 변수 설정
```bash
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 및 API 키 설정
```

### 5. 데이터베이스 초기화
```bash
python manage.py migrate
python manage.py createsuperuser
```

### 6. AI 모델 다운로드
```bash
python scripts/download_models.py
```

### 7. 서버 실행
```bash
python manage.py runserver 0.0.0.0:8000
```

## 📖 사용법

### 의사용 인터페이스
1. **환자 등록**: 새 환자 정보 입력 및 관리
2. **영상 업로드**: 흉부 X-ray 이미지 업로드
3. **AI 분석 실행**: 자동 병변 탐지 및 결과 확인
4. **음성 진료 기록**: STT 기능으로 실시간 진료 기록 작성
5. **진단 리포트**: 종합 진단 보고서 생성 및 출력

### 병원 관리자용 기능
- 시스템 사용 통계 및 성능 모니터링
- 사용자 권한 관리
- AI 모델 성능 지표 확인
- 데이터 백업 및 복원

## 🤖 AI 모델 세부사항

### YOLO (You Only Look Once)
- **용도**: 실시간 흉부 이상 소견 탐지
- **성능**: mAP@0.5 62.1%
- **처리속도**: 평균 45ms per image

### SSD (Single Shot MultiBox Detector)
- **용도**: 다양한 크기의 병변 동시 탐지
- **성능**: mAP@0.5:0.95 71.8%
- **특징**: Multi-scale feature detection

### SimCLR (Simple Contrastive Learning)
- **용도**: 자기지도학습 기반 특징 추출
- **데이터**: 50,000+ 무라벨 흉부 X-ray
- **성능**: 정확도 75.6%

## 📊 성능 지표

| 모델 | 정확도 | 민감도 | 특이도 | F1-Score |
|------|--------|--------|--------|----------|
| YOLO | 61.2%  | 59.8%  | 62.5%  | 0.608    |
| SSD  | 72.4%  | 71.1%  | 73.7%  | 0.723    |
| SimCLR | 75.6% | 74.2%  | 77.1%  | 0.756    |

## 🛠️ 기술 스택

**Backend**
- Python 3.9
- Django 4.1
- PostgreSQL
- Redis (캐싱)

**AI/ML**
- PyTorch 1.12
- OpenCV 4.6
- TensorFlow 2.9
- scikit-learn

**Frontend**
- React 18
- TypeScript
- Material-UI
- Chart.js

**Infrastructure**
- Docker & Docker Compose
- NGINX
- Gunicorn
- Celery (비동기 작업)

## 📋 API 문서

### 주요 엔드포인트

```bash
# 환자 관리
GET /api/patients/          # 환자 목록 조회
POST /api/patients/         # 새 환자 등록
GET /api/patients/{id}/     # 특정 환자 정보

# 영상 분석
POST /api/analyze/chest/    # 흉부 X-ray 분석 요청
GET /api/analyze/{job_id}/  # 분석 결과 조회

# 음성 인식
POST /api/stt/start/        # STT 세션 시작
POST /api/stt/upload/       # 음성 파일 업로드
GET /api/stt/result/{id}/   # 변환 결과 조회
```

자세한 API 문서는 `/docs/` 에서 확인하실 수 있습니다.

## 🔒 보안 및 개인정보보호

- **HIPAA 준수**: 의료 정보 보호 규정 완전 준수
- **데이터 암호화**: AES-256 암호화로 모든 민감 데이터 보호
- **접근 제어**: 역할 기반 권한 관리 (RBAC)
- **감사 로그**: 모든 시스템 접근 및 수정 사항 기록

## 🧪 테스트

```bash
# 단위 테스트 실행
python -m pytest tests/

# AI 모델 테스트
python -m pytest tests/ai_models/

# API 테스트
python -m pytest tests/api/

# 커버리지 리포트
python -m pytest --cov=./ --cov-report=html
```

## 📈 로드맵

### 🚧 개발 중 (90% 완료)
- [x] 기본 UI/UX 구현
- [x] YOLO 모델 통합
- [x] SSD 모델 구현
- [x] SimCLR 학습 파이프라인
- [x] STT 엔진 구현
- [x] LIS 시스템 연동
- [ ] 최종 성능 최적화
- [ ] 사용자 테스트 및 피드백 반영

### 🔮 향후 계획
- CT 스캔 이미지 분석 지원
- 다국어 STT 지원
- 모바일 앱 개발
- 실시간 원격 진료 기능

## 👥 기여하기

LaCID 프로젝트에 기여해주셔서 감사합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 기여 가이드라인
- 의료 데이터 보안 규정 준수
- 코드 스타일: PEP 8 (Python), Prettier (JavaScript)
- 모든 새 기능에 대한 테스트 코드 작성 필수
- 상세한 commit message 작성

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 연락처

**프로젝트 관리자**: [YangGo7](https://github.com/YangGo7)
- 📧 Email: yanggo7@example.com
- 💼 LinkedIn: [YangGo7](https://linkedin.com/in/yanggo7)

**이슈 리포트**: [GitHub Issues](https://github.com/YangGo7/medisys/issues)

---

### ⚠️ 중요 안내

이 시스템은 진단 보조 도구로 설계되었으며, 최종 진단은 반드시 의료진의 전문적 판단에 따라 이루어져야 합니다. AI 분석 결과는 참고용으로만 사용하시기 바랍니다.

---

<div align="center">

**LaCID로 더 스마트한 의료 서비스를 경험하세요** 🏥✨
</div>
