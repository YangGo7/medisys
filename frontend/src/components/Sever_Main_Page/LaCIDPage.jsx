import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, X, Stethoscope, Users, Brain, ChevronRight, Mail, Phone, MapPin, Award
} from 'lucide-react';
import './LaCIDPage.css';
import lacidLogo from '../Styles/LaCID_01.png';

const LaCIDPage = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  const scrollToSection = (section) => {
    setActiveSection(section);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="header">
        <div className="container">
          <nav className="nav">
            {/* Logo */}
            <a href="#" className="logo flex flex-col items-center text-center">
              <img src={lacidLogo} alt="LaCID Logo" className="w-10 h-auto mb-1" />
              <p className="text-sm text-blue-700 font-medium">
                Lung Anomaly Clinical Intelligence Decision-support
              </p>
            </a>

            {/* Desktop Navigation */}
            <div className="nav-links">
              <button
                onClick={() => scrollToSection('overview')}
                className={`btn-secondary ${activeSection === 'overview' ? 'active' : ''}`}
              >
                회사 개요
              </button>
              <button
                onClick={() => scrollToSection('team')}
                className={`btn-secondary ${activeSection === 'team' ? 'active' : ''}`}
              >
                팀원 소개
              </button>
              <button
                onClick={() => scrollToSection('tech')}
                className={`btn-secondary ${activeSection === 'tech' ? 'active' : ''}`}
              >
                기술 소개
              </button>
              <button onClick={handleLogin} className="btn-primary">
                로그인
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="mobile-menu-btn"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
            <button onClick={() => scrollToSection('overview')} className="btn-secondary">회사 개요</button>
            <button onClick={() => scrollToSection('team')} className="btn-secondary">팀원 소개</button>
            <button onClick={() => scrollToSection('tech')} className="btn-secondary">기술 소개</button>
            <button onClick={handleLogin} className="btn-secondary">로그인</button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h2>
                정밀 의료를 위한
                <span className="block gradient-text">CDSS</span>
              </h2>
              <p>AI 기반 흉부영상 판독 및 종합 진단을 지원합니다.</p>
              <button onClick={handleLogin} className="btn-primary">
                더 알아보기 <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Company Overview */}
        {activeSection === 'overview' && (
          <section className="section">
            <div className="container">
              <h3 className="section-title">회사 개요</h3>
              <p className="section-subtitle">
                흉부 AI 진단의 혁신을 이끄는 LaCID
              </p>

              <div className="grid-2 mb-20">
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-6">우리의 미션</h4>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    LaCID는 Lung Anomaly Clinical Intelligence Decision-support의 약자로, 흉부 영상 진단에 특화된 AI 기반 임상 의사결정 지원 시스템을 개발하는 전문 기업입니다.
                  </p>
                  <p className="text-gray-600 leading-relaxed">
                    우리는 첨단 인공지능 기술을 활용하여 폐 질환의 조기 발견과 정확한 진단을 지원함으로써, 의료진의 진단 정확도를 높이고 환자의 치료 결과를 개선하는 것을 목표로 합니다.
                  </p>
                </div>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">98%</span>
                    <span className="stat-label">진단 정확도</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">50+</span>
                    <span className="stat-label">파트너 병원</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">100K+</span>
                    <span className="stat-label">분석된 영상</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">24/7</span>
                    <span className="stat-label">실시간 지원</span>
                  </div>
                </div>
              </div>

              <div className="grid-4">
                {[
                  { icon: '🎯', title: '정확성', desc: '높은 진단 정확도를 통한 신뢰할 수 있는 의료 지원' },
                  { icon: '⚡', title: '신속성', desc: '빠른 분석으로 골든타임 확보' },
                  { icon: '🔬', title: '혁신성', desc: '지속적인 연구개발을 통한 기술 발전' },
                  { icon: '🤝', title: '협력', desc: '의료진과의 긴밀한 협업' }
                ].map((value, index) => (
                  <div key={index} className="value-card">
                    <div className="value-icon">{value.icon}</div>
                    <h5 className="value-title">{value.title}</h5>
                    <p className="value-desc">{value.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Team Section */}
        {activeSection === 'team' && (
          <section className="section gray-bg">
            <div className="container">
              <h3 className="section-title">팀원 소개</h3>
              <p className="section-subtitle">전문성과 경험을 갖춘 우리 팀을 소개합니다</p>

              <div className="grid-3">
                {[
                  { name: '김영수', role: 'CEO & 창립자', desc: '의료 AI 분야 15년 경력의 전문가로, 흉부 영상 진단 시스템 개발을 주도하고 있습니다.', initial: '김' },
                  { name: '박지혜', role: 'CTO', desc: '컴퓨터 비전과 딥러닝 전문가로, LaCID의 핵심 AI 알고리즘을 개발하고 있습니다.', initial: '박' },
                  { name: '이현우', role: '의료진 파트너', desc: '흉부외과 전문의로, 임상 검증과 의료진 교육 프로그램을 담당합니다.', initial: '이' },
                  { name: '최민정', role: '데이터 사이언티스트', desc: '의료 빅데이터 분석 전문가로, AI 모델의 성능 향상과 데이터 품질 관리를 담당합니다.', initial: '최' },
                  { name: '정승호', role: '품질보증 매니저', desc: '의료기기 품질관리 전문가로, 시스템의 안전성과 신뢰성을 보장합니다.', initial: '정' },
                  { name: '강수연', role: '사업개발 매니저', desc: '병원 파트너십과 사업 확장을 담당하며, 고객 관계 관리를 전담합니다.', initial: '강' }
                ].map((member, index) => (
                  <div key={index} className="team-member">
                    <div className="member-avatar">{member.initial}</div>
                    <h4 className="member-name">{member.name}</h4>
                    <p className="member-role">{member.role}</p>
                    <p className="member-desc">{member.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Technology Section */}
        {activeSection === 'tech' && (
          <section className="section">
            <div className="container">
              <h3 className="section-title">기술 소개</h3>
              <p className="section-subtitle">혁신적인 AI 모델과 첨단 기술을 소개합니다</p>

              <div className="grid-3 mb-16">
                {[
                  { icon: '🫁', title: '폐 결절 검출 모델', desc: '흉부 CT 영상에서 폐 결절을 자동으로 검출하고 크기와 위치를 정확히 분석하는 AI 모델입니다.' },
                  { icon: '🩻', title: '흉부 X-ray 분류 모델', desc: '폐렴, 기흉, 폐부종 등 주요 흉부 질환을 X-ray 영상에서 분류하는 딥러닝 모델입니다.' },
                  { icon: '🎯', title: '폐암 악성도 예측 모델', desc: '발견된 폐 결절의 악성 가능성을 예측하여 의료진의 치료 계획 수립을 지원합니다.' },
                  { icon: '📊', title: '질병 진행 모니터링', desc: '시계열 영상 분석을 통해 폐 질환의 진행 상태를 추적하고 치료 효과를 평가합니다.' },
                  { icon: '🔗', title: 'PACS 연동 시스템', desc: '기존 병원의 PACS와 완벽하게 연동되어 워크플로우 중단 없이 AI 분석 결과를 제공합니다.' },
                  { icon: '⚡', title: '실시간 처리 엔진', desc: '고성능 GPU 클러스터 기반의 실시간 영상 처리 시스템으로 빠른 진단 지원이 가능합니다.' }
                ].map((tech, index) => (
                  <div key={index} className="tech-card">
                    <div className="tech-icon">{tech.icon}</div>
                    <h4 className="tech-title">{tech.title}</h4>
                    <p className="tech-desc">{tech.desc}</p>
                  </div>
                ))}
              </div>

              <div className="tech-features">
                <h4>기술 특장점</h4>
                <div className="features-grid">
                  {[
                    { icon: '🏥', title: '임상 검증', desc: '50개 이상 병원에서 실제 임상 환경에서 검증된 기술' },
                    { icon: '📈', title: '지속적 학습', desc: '새로운 데이터로 모델을 지속적으로 개선' },
                    { icon: '🔒', title: '보안성', desc: '의료정보 보호를 위한 최고 수준의 보안 시스템' },
                    { icon: '🌐', title: '표준 호환', desc: 'DICOM, HL7 등 의료 표준을 완벽 지원' }
                  ].map((feature, index) => (
                    <div key={index} className="feature-item">
                      <div className="feature-icon">{feature.icon}</div>
                      <h5 className="feature-title">{feature.title}</h5>
                      <p className="feature-desc">{feature.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-section">
              <h4>회사 정보</h4>
              <p><strong>LaCID Co., Ltd.</strong></p>
              <div className="contact-item">
                <MapPin className="w-4 h-4" />
                <span>서울 강남구 테헤란로 123</span>
              </div>
              <div className="contact-item">
                <Phone className="w-4 h-4" />
                <span>02-1234-5678</span>
              </div>
              <div className="contact-item">
                <Mail className="w-4 h-4" />
                <span>info@lacid.ai</span>
              </div>
            </div>
            
            <div className="footer-section">
              <h4>연구소</h4>
              <div className="contact-item">
                <MapPin className="w-4 h-4" />
                <span>대전 유성구 대학로 291</span>
              </div>
              <div className="contact-item">
                <Phone className="w-4 h-4" />
                <span>042-987-6543</span>
              </div>
              <div className="contact-item">
                <Mail className="w-4 h-4" />
                <span>research@lacid.ai</span>
              </div>
            </div>
            
            <div className="footer-section">
              <h4>사업 분야</h4>
              <ul>
                <li>• 흉부 AI 진단 시스템</li>
                <li>• 의료 영상 분석 솔루션</li>
                <li>• CDSS 플랫폼 개발</li>
                <li>• 의료진 교육 프로그램</li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>인증 및 허가</h4>
              <ul>
                <li className="contact-item">
                  <Award className="w-4 h-4" />
                  <span>의료기기 제조업 허가</span>
                </li>
                <li className="contact-item">
                  <Award className="w-4 h-4" />
                  <span>ISO 13485 인증</span>
                </li>
                <li className="contact-item">
                  <Award className="w-4 h-4" />
                  <span>소프트웨어 의료기기 허가</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2025 LaCID Co., Ltd. All rights reserved.</p>
            <p>대표이사: 김영수 | 사업자등록번호: 123-45-67890</p>
          </div>
        </div>
      </footer>

      
    </div>
  );
};

export default LaCIDPage;