import React from 'react';

const PatientInfoPanel = ({ patient, onOpenDetailModal }) => {
  if (!patient) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <h3>👤 환자 정보</h3>
        <p>환자를 선택해 주세요.</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '1rem',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>
        👤 환자 정보
      </h3>

      {/* 🔥 완전한 환자 정보 표시 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
      }}>
        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#e3f2fd', 
          borderRadius: '6px',
          border: '1px solid #90caf9'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1976d2', marginBottom: '0.5rem' }}>
            환자 ID
          </div>
          <div style={{ 
            fontSize: '16px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            color: '#0d47a1'
          }}>
            {patient.patient_identifier || 'N/A'}
          </div>
        </div>

        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#f3e5f5', 
          borderRadius: '6px',
          border: '1px solid #ce93d8'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#7b1fa2', marginBottom: '0.5rem' }}>
            환자명
          </div>
          <div style={{ 
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#4a148c'
          }}>
            {patient.name || 'N/A'}
          </div>
        </div>

        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: patient.gender === 'M' ? '#e8f5e8' : '#fce4ec', 
          borderRadius: '6px',
          border: `1px solid ${patient.gender === 'M' ? '#a5d6a7' : '#f8bbd9'}`
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: patient.gender === 'M' ? '#2e7d32' : '#c2185b', 
            marginBottom: '0.5rem' 
          }}>
            성별
          </div>
          <div style={{ 
            fontSize: '16px',
            fontWeight: 'bold',
            color: patient.gender === 'M' ? '#1b5e20' : '#880e4f'
          }}>
            {patient.gender === 'M' ? '남성' : patient.gender === 'F' ? '여성' : 'N/A'}
          </div>
        </div>

        <div style={{ 
          padding: '0.75rem', 
          backgroundColor: '#fff8e1', 
          borderRadius: '6px',
          border: '1px solid #ffcc02'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#f57f17', marginBottom: '0.5rem' }}>
            나이
          </div>
          <div style={{ 
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#e65100'
          }}>
            {patient.age || 'N/A'}세
          </div>
        </div>
      </div>

      {/* 생년월일 (있는 경우) */}
      {patient.birthdate && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f1f8e9',
          borderRadius: '6px',
          border: '1px solid #c8e6c9'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#388e3c', marginBottom: '0.5rem' }}>
            생년월일
          </div>
          <div style={{ fontSize: '14px', color: '#2e7d32' }}>
            {new Date(patient.birthdate).toLocaleDateString('ko-KR')}
          </div>
        </div>
      )}

      {/* 시스템 정보 (개발자용) */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#666'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>시스템 정보</div>
        <div><strong>Person UUID:</strong> {patient.uuid || 'N/A'}</div>
        <div><strong>Display:</strong> {patient.display || 'N/A'}</div>
        {patient.mapping_id && (
          <div><strong>Mapping ID:</strong> {patient.mapping_id}</div>
        )}
        {patient.status && (
          <div><strong>상태:</strong> {patient.status}</div>
        )}
      </div>

      {/* 상세보기 버튼 */}
      {onOpenDetailModal && (
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <button
            onClick={() => onOpenDetailModal(patient)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            📋 상세 정보 보기
          </button>
        </div>
      )}
    </div>
  );
};

export default PatientInfoPanel;