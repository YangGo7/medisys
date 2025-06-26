import React, { useState } from 'react';
import axios from 'axios';
import { TestTube, AlertCircle, Check, Loader, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { 
  panelComponents, 
  LIS_API, 
  getFullApiUrl 
} from './lisConfig';

const LisRequestPanel = ({ patient }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    selectedPanel: '',
    priority: 'NORMAL',
    clinicalInfo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const totalSteps = 2;

  const nextStep = () => {
    if (currentStep < totalSteps && formData.selectedPanel) {
      setCurrentStep(currentStep + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.selectedPanel || !patient) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const orderData = {
        patient_id: patient.identifier || patient.identifiers?.[0]?.identifier || patient.uuid,
        patient_name: patient.display || patient.name,
        patient_uuid: patient.uuid,
        doctor_id: localStorage.getItem('doctor_id') || 'DEFAULT_DOCTOR',
        panel_name: formData.selectedPanel,
        test_items: panelComponents[formData.selectedPanel],
        priority: formData.priority,
        sample_type: 'BLOOD',
        clinical_info: formData.clinicalInfo || `${formData.selectedPanel} 검사 요청`,
        requested_date: new Date().toISOString()
      };

      await axios.post(getFullApiUrl(LIS_API.CREATE_ORDER), orderData);
      
      setSuccess(true);
      setFormData({ selectedPanel: '', priority: 'NORMAL', clinicalInfo: '' });
      setCurrentStep(1);
      
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error('❌ LIS 검사 주문 실패:', err);
      setError('검사 주문 실패');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="no-patient">
        <TestTube size={20} />
        <p>환자 선택 필요</p>
      </div>
    );
  }

  return (
    <div className="compact-lis-panel">


      {/* 스텝 1: 검사 패널 + 우선순위 */}
      {currentStep === 1 && (
        <div className="step-content">
          <button
            onClick={nextStep}
            disabled={!formData.selectedPanel}
            className="next-btn-top"
          >
            다음 <ChevronRight size={14} />
          </button>

          <div className="form-row">
            <div className="form-group">
              <label>검사 패널</label>
              <select
                value={formData.selectedPanel}
                onChange={(e) => setFormData(prev => ({ ...prev, selectedPanel: e.target.value }))}
                className="form-select"
              >
                <option value="">선택하세요</option>
                {Object.keys(panelComponents).map(panel => (
                  <option key={panel} value={panel}>
                    {panel} ({panelComponents[panel].length}개)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>우선순위</label>
              <div className="priority-grid">
                {[
                  { value: 'NORMAL', label: '일반', color: '#28a745' },
                  { value: 'URGENT', label: '응급', color: '#ffc107' },
                  { value: 'STAT', label: '즉시', color: '#dc3545' }
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    className={`priority-btn ${formData.priority === value ? 'active' : ''}`}
                    style={{ 
                      borderColor: formData.priority === value ? color : '#ddd',
                      backgroundColor: formData.priority === value ? color : '#fff',
                      color: formData.priority === value ? '#fff' : '#666'
                    }}
                    onClick={() => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    {value === 'STAT' && <Zap size={10} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 스텝 2: 임상정보 + 최종 요청 */}
      {currentStep === 2 && (
        <div className="step-content">
          <div className="selected-info">
            <div className="info-item">
              <strong>{formData.selectedPanel}</strong>
              <span className="priority-badge" style={{
                backgroundColor: formData.priority === 'NORMAL' ? '#28a745' :
                                  formData.priority === 'URGENT' ? '#ffc107' : '#dc3545'
              }}>
                {formData.priority === 'NORMAL' ? '일반' :
                 formData.priority === 'URGENT' ? '응급' : '즉시'}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label>임상정보</label>
            <textarea
              value={formData.clinicalInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, clinicalInfo: e.target.value }))}
              className="form-textarea"
              placeholder="임상정보 입력 (선택사항)"
              rows="3"
            />
          </div>

          {error && (
            <div className="status-message error">
              <AlertCircle size={12} />
              {error}
            </div>
          )}

          {success && (
            <div className="status-message success">
              <Check size={12} />
              요청 완료!
            </div>
          )}

          <div className="button-row">
            <button onClick={prevStep} className="back-btn">
              <ChevronLeft size={14} /> 이전
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="submit-btn"
            >
              {loading ? (
                <>
                  <Loader size={14} className="spinning" />
                  요청중...
                </>
              ) : (
                <>
                  <TestTube size={14} />
                  검사요청
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .compact-lis-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          gap: 0.75rem;
        }

        .no-patient {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #999;
          gap: 0.5rem;
        }



        .step-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #333;
        }

        .form-select {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .form-select:focus {
          outline: none;
          border-color: var(--secondary-purple);
        }

        .priority-grid {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .priority-btn {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
        }

        .next-btn-top {
          background: var(--secondary-purple);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          align-self: flex-end;
        }

        .next-btn-top:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .selected-info {
          background: rgba(139, 92, 246, 0.1);
          padding: 0.75rem;
          border-radius: 6px;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .priority-badge {
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: bold;
          color: white;
        }

        .form-textarea {
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.8rem;
          font-family: inherit;
          resize: vertical;
        }

        .form-textarea:focus {
          outline: none;
          border-color: var(--secondary-purple);
        }

        .status-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 6px;
          font-size: 0.8rem;
        }

        .status-message.error {
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
          border: 1px solid rgba(220, 53, 69, 0.2);
        }

        .status-message.success {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.2);
        }

        .button-row {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 0.5rem;
          margin-top: auto;
        }

        .back-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 0.75rem;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LisRequestPanel;