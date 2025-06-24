
// 시간 관련 유틸리티 함수들

/**
 * 시작 시간과 소요시간으로 종료 시간 계산
 * @param {string} startTime - 시작 시간 (HH:MM 형식)
 * @param {number} duration - 소요시간 (분 단위)
 * @returns {string} 종료 시간 (HH:MM 형식)
 */
export const getEndTime = (startTime, duration) => {
  const [hour, minute] = startTime.split(':').map(Number);
  const totalMinutes = hour * 60 + minute + parseInt(duration);
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
};

/**
 * 모달리티별 기본 소요시간 반환
 * @param {string} modality - 검사 모달리티
 * @returns {number} 기본 소요시간 (분 단위)
 */
export const getDefaultDuration = (modality) => {
  switch (modality) {
    case 'X-Ray': return 20;
    case '초음파': return 30;
    case 'CT': return 30;
    case 'MRI': return 50;
    default: return 30;
  }
};

/**
 * 현재 시간이 검사 완료 시간을 지났는지 확인
 * @param {Date} startTime - 검사 시작 시간
 * @param {number} duration - 소요시간 (분 단위)
 * @returns {boolean} 완료 시간을 지났으면 true
 */
export const isExamTimeExpired = (startTime, duration) => {
  if (!startTime) return false;
  
  const now = new Date();
  const examEndTime = new Date(startTime.getTime() + duration * 60000);
  return now >= examEndTime;
};

/**
 * 시간 문자열을 Date 객체로 변환
 * @param {string} timeString - 시간 문자열 (HH:MM 형식)
 * @param {Date} baseDate - 기준 날짜 (선택사항, 기본값: 오늘)
 * @returns {Date} Date 객체
 */
export const timeStringToDate = (timeString, baseDate = new Date()) => {
  const [hour, minute] = timeString.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hour, minute, 0, 0);
  return date;
};

/**
 * 두 시간 사이의 겹침 여부 확인
 * @param {string} start1 - 첫 번째 시작 시간
 * @param {number} duration1 - 첫 번째 소요시간
 * @param {string} start2 - 두 번째 시작 시간
 * @param {number} duration2 - 두 번째 소요시간
 * @returns {boolean} 겹치면 true
 */
export const isTimeOverlapping = (start1, duration1, start2, duration2) => {
  const end1 = getEndTime(start1, duration1);
  const end2 = getEndTime(start2, duration2);
  
  // 시간을 분으로 변환
  const toMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  
  const start1Min = toMinutes(start1);
  const end1Min = toMinutes(end1);
  const start2Min = toMinutes(start2);
  const end2Min = toMinutes(end2);
  
  return !(end1Min <= start2Min || end2Min <= start1Min);
};