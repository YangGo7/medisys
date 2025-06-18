// src/components/EMR/home/UrgentWidget.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AlertCircle, Loader2 } from 'lucide-react';

const UrgentWidget = ({
  // 원래 있던 props 유지 (urgentEvents 기본값은 이제 내부에서 fetch하므로 제거)
  showActionButtons = true,
  onShowDetail = () => {},
}) => {
  const [alerts, setAlerts] = useState([]); // 실제 API에서 가져올 알림 데이터를 저장할 상태
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태
  const [loadingId, setLoadingId] = useState(null); // 상세 보기 버튼 로딩

  const API_BASE = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';
  const ALERT_API_ENDPOINT = `${API_BASE}alerts/urgent/`;
  const POLL_INTERVAL_MS = 10000; // 10초마다 알림 갱신

  // 알림 데이터를 가져오는 함수
  const fetchUrgentAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(ALERT_API_ENDPOINT);
      setAlerts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('❌ 긴급 알림 불러오기 실패:', err);
      setError('긴급 알림을 불러오지 못했습니다.');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [ALERT_API_ENDPOINT]);

  // 컴포넌트 마운트 시 및 주기적 폴링
  useEffect(() => {
    fetchUrgentAlerts(); // 최초 로드
    const interval = setInterval(fetchUrgentAlerts, POLL_INTERVAL_MS); // 주기적 갱신
    return () => clearInterval(interval); // 클린업
  }, [fetchUrgentAlerts]);

  // Alert 데이터 -> UrgentWidget UI 형식으로 매핑
  const mappedUrgentEvents = alerts.map(alert => {
    let patientName = '';
    let patientId = '';
    let value = '';
    let unit = '';
    let recommended = '';
    let atTime = new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 임시 매핑: Alert.message를 최대한 활용하여 표시
    switch(alert.type) {
        case 'SPO2':
            patientName = alert.message.includes(' - ') ? alert.message.split(' - ')[1].trim() : '환자 정보 없음';
            patientId = alert.message.match(/ID (\d+)/) ? alert.message.match(/ID (\d+)/)[1] : '';
            value = alert.message.match(/SpO₂ (.+?)%/) ? alert.message.match(/SpO₂ (.+?)%/)[1] : '';
            unit = '%';
            recommended = '산소 투여';
            break;
        case 'BP':
            patientName = alert.message.includes(' - ') ? alert.message.split(' - ')[1].trim() : '환자 정보 없음';
            patientId = alert.message.match(/ID (\d+)/) ? alert.message.match(/ID (\d+)/)[1] : '';
            // 🚨 정규 표현식 오류 수정 및 혈압 값 파싱 로직 개선
            const bpMatch = alert.message.match(/혈압\s*(.+)/); // "혈압 " 뒤의 모든 문자열 캡처
            value = bpMatch && bpMatch[1] ? bpMatch[1].split(' - ')[0].trim() : ''; // 캡처된 문자열에서 ' - ' 앞부분만 값으로
            unit = '';
            recommended = '혈압약 투여';
            break;
        case 'AI_ERR': // AI_ERROR는 AI_ERR로 매핑
            patientName = alert.message.includes(' - ') ? alert.message.split(' - ')[1].trim() : '환자 정보 없음';
            patientId = alert.message.match(/ID (\d+)/) ? alert.message.match(/ID (\d+)/)[1] : '';
            recommended = '재시도';
            break;
        case 'DELAY': // '검사 지역'이라는 Alert.type이 있다면
            patientName = alert.message.includes(' - ') ? alert.message.split(' - ')[1].trim() : '환자 정보 없음';
            patientId = alert.message.match(/ID (\d+)/) ? alert.message.match(/ID (\d+)/)[1] : '';
            recommended = '담당자 확인';
            break;
        default:
            patientName = alert.message.split(' - ')[0]; // 첫 부분을 환자명으로
            patientId = ''; // ID는 알 수 없음
            value = '';
            unit = '';
            recommended = '확인 필요';
    }

    return {
      id: alert.id,
      type: alert.type,
      patient: patientName,
      patient_id: patientId,
      value: value,
      unit: unit,
      at: atTime,
      severity: 'high', // Alert 모델에 severity 필드가 없으므로 임의로 지정 (백엔드에 추가 고려)
      recommended: recommended,
      raw_message: alert.message, // 원본 메시지를 저장하여 디버깅 또는 상세 보기에 활용
    };
  });

  const orangeBadge = {
    label: '🟠',
    color: '#fff3e0',
    border: '#ffb74d'
  };

  const handleDetailClick = async (event) => {
    setLoadingId(event.id);
    try {
      await axios.patch(`${API_BASE}alerts/${event.id}/mark-read/`, { is_read: true });
      alert(`알림 "${event.raw_message}"을(를) 읽음 처리했습니다.`);
      fetchUrgentAlerts(); // 읽음 처리 후 목록 새로고침
    } catch (err) {
      console.error('알림 읽음 처리 실패:', err);
      alert('알림 읽음 처리에 실패했습니다: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      className="urgent-widget"
      style={{
        background: orangeBadge.color,
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        padding: 12,
        // 이 부분을 수정했습니다: 컨테이너를 flex로 만들어서 내부 요소를 정렬
        display: 'flex',          // Flex 컨테이너로 설정
        flexDirection: 'column',  // 자식 요소들을 세로로 정렬
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <h3
        className="card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#e65100',
          margin: 0,
          marginBottom: 12,
          flexShrink: 0, // 헤더가 줄어들지 않도록 고정
        }}
      >
        <AlertCircle size={20} />
        긴급 처리{' '}
        {loading ? (
          <Loader2 size={16} className="spin" style={{ color: '#e65100' }} />
        ) : error ? (
          <span style={{ color: 'red', fontSize: '0.8rem' }}> (에러)</span>
        ) : (
          <span style={{ opacity: 0.7 }}>({mappedUrgentEvents.length})</span>
        )}
      </h3>

      <ul
        className="card-list"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          flexGrow: 1, // 남은 공간을 모두 차지하도록 설정
          justifyContent: 'center', // 세로 방향 중앙 정렬
          alignItems: 'center',    // 가로 방향 중앙 정렬
        }}
      >
        {loading ? (
          <li style={{ textAlign: 'center', color: '#666', width: '100%', paddingTop: '30px', fontSize: '1.1rem' }}>
            알림 로딩 중...
          </li>
        ) : error ? (
          <li style={{ textAlign: 'center', color: 'red', width: '100%', paddingTop: '30px', fontSize: '1.1rem' }}>
            {error}
          </li>
        ) : mappedUrgentEvents.length === 0 ? (
          // 🚨🚨🚨 이 <li> 태그의 스타일을 수정했습니다.
          <li style={{ textAlign: 'center', color: '#666', width: '100%', paddingTop: '30px', fontSize: '1.1rem' }}>
            새로운 긴급 알림이 없습니다.
          </li>
        ) : (
          mappedUrgentEvents.map(ev => {
            const { label, color, border } = orangeBadge;
            return (
              <li
                key={ev.id}
                className="card-list-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: color,
                  border: `2px solid ${border}`,
                  borderRadius: 6,
                  padding: '8px 12px',
                }}
              >
                <span style={{ marginRight: 12, fontSize: '1.2rem' }}>{label}</span>
                <div style={{ flex: 1, lineHeight: 1.3 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {ev.patient} (ID {ev.patient_id})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#444' }}>
                    {ev.type === 'SPO2'
                      ? `SpO₂ ${ev.value}${ev.unit}`
                      : ev.type === 'BP'
                      ? `혈압 ${ev.value}`
                      : ev.type === 'AI_ERR'
                      ? 'AI 판독 오류'
                      : ev.value !== null && ev.value !== undefined
                      ? `${ev.value}${ev.unit}`
                      : ev.raw_message}{' '}
                    · {ev.at}
                  </div>
                </div>
                {showActionButtons && (
                  <button
                    onClick={() => handleDetailClick(ev)}
                    disabled={loadingId === ev.id}
                    style={{
                      marginLeft: 12,
                      padding: '6px 10px',
                      fontSize: '0.85rem',
                      borderRadius: 4,
                      border: 'none',
                      background: '#ffe0b2',
                      color: '#e65100',
                      cursor: loadingId === ev.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {loadingId === ev.id ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      '읽음 처리'
                    )}
                  </button>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default UrgentWidget;