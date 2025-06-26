
// // // 시간 관련 유틸리티 함수들

// // /**
// //  * 시작 시간과 소요시간으로 종료 시간 계산
// //  * @param {string} startTime - 시작 시간 (HH:MM 형식)
// //  * @param {number} duration - 소요시간 (분 단위)
// //  * @returns {string} 종료 시간 (HH:MM 형식)
// //  */
// // export const getEndTime = (startTime, duration) => {
// //   const [hour, minute] = startTime.split(':').map(Number);
// //   const totalMinutes = hour * 60 + minute + parseInt(duration);
// //   const endHour = Math.floor(totalMinutes / 60);
// //   const endMinute = totalMinutes % 60;
// //   return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
// // };

// // /**
// //  * 모달리티별 기본 소요시간 반환
// //  * @param {string} modality - 검사 모달리티
// //  * @returns {number} 기본 소요시간 (분 단위)
// //  */
// // export const getDefaultDuration = (modality) => {
// //   switch (modality) {
// //     case 'X-Ray': return 20;
// //     case '초음파': return 30;
// //     case 'CT': return 30;
// //     case 'MRI': return 50;
// //     default: return 30;
// //   }
// // };

// // /**
// //  * 현재 시간이 검사 완료 시간을 지났는지 확인
// //  * @param {Date} startTime - 검사 시작 시간
// //  * @param {number} duration - 소요시간 (분 단위)
// //  * @returns {boolean} 완료 시간을 지났으면 true
// //  */
// // export const isExamTimeExpired = (startTime, duration) => {
// //   if (!startTime) return false;
  
// //   const now = new Date();
// //   const examEndTime = new Date(startTime.getTime() + duration * 60000);
// //   return now >= examEndTime;
// // };

// // /**
// //  * 시간 문자열을 Date 객체로 변환
// //  * @param {string} timeString - 시간 문자열 (HH:MM 형식)
// //  * @param {Date} baseDate - 기준 날짜 (선택사항, 기본값: 오늘)
// //  * @returns {Date} Date 객체
// //  */
// // export const timeStringToDate = (timeString, baseDate = new Date()) => {
// //   const [hour, minute] = timeString.split(':').map(Number);
// //   const date = new Date(baseDate);
// //   date.setHours(hour, minute, 0, 0);
// //   return date;
// // };

// // /**
// //  * 두 시간 사이의 겹침 여부 확인
// //  * @param {string} start1 - 첫 번째 시작 시간
// //  * @param {number} duration1 - 첫 번째 소요시간
// //  * @param {string} start2 - 두 번째 시작 시간
// //  * @param {number} duration2 - 두 번째 소요시간
// //  * @returns {boolean} 겹치면 true
// //  */
// // export const isTimeOverlapping = (start1, duration1, start2, duration2) => {
// //   const end1 = getEndTime(start1, duration1);
// //   const end2 = getEndTime(start2, duration2);
  
// //   // 시간을 분으로 변환
// //   const toMinutes = (timeStr) => {
// //     const [h, m] = timeStr.split(':').map(Number);
// //     return h * 60 + m;
// //   };
  
// //   const start1Min = toMinutes(start1);
// //   const end1Min = toMinutes(end1);
// //   const start2Min = toMinutes(start2);
// //   const end2Min = toMinutes(end2);
  
// //   return !(end1Min <= start2Min || end2Min <= start1Min);
// // };

// // /home/medical_system/pacsapp/src/utils/timeUtils.js
// // 기존 시간 유틸리티 + 시간대 처리 기능 추가

// // ========== 기존 함수들 ==========

// /**
//  * 시작 시간과 소요시간으로 종료 시간 계산
//  * @param {string} startTime - 시작 시간 (HH:MM 형식)
//  * @param {number} duration - 소요시간 (분 단위)
//  * @returns {string} 종료 시간 (HH:MM 형식)
//  */
// export const getEndTime = (startTime, duration) => {
//   const [hour, minute] = startTime.split(':').map(Number);
//   const totalMinutes = hour * 60 + minute + parseInt(duration);
//   const endHour = Math.floor(totalMinutes / 60);
//   const endMinute = totalMinutes % 60;
//   return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
// };

// /**
//  * 모달리티별 기본 소요시간 반환
//  * @param {string} modality - 검사 모달리티
//  * @returns {number} 기본 소요시간 (분 단위)
//  */
// export const getDefaultDuration = (modality) => {
//   switch (modality) {
//     case 'X-Ray': return 20;
//     case '초음파': return 30;
//     case 'CT': return 30;
//     case 'MRI': return 50;
//     default: return 30;
//   }
// };

// /**
//  * 현재 시간이 검사 완료 시간을 지났는지 확인
//  * @param {Date} startTime - 검사 시작 시간
//  * @param {number} duration - 소요시간 (분 단위)
//  * @returns {boolean} 완료 시간을 지났으면 true
//  */
// export const isExamTimeExpired = (startTime, duration) => {
//   if (!startTime) return false;
  
//   const now = new Date();
//   const examEndTime = new Date(startTime.getTime() + duration * 60000);
//   return now >= examEndTime;
// };

// /**
//  * 시간 문자열을 Date 객체로 변환
//  * @param {string} timeString - 시간 문자열 (HH:MM 형식)
//  * @param {Date} baseDate - 기준 날짜 (선택사항, 기본값: 오늘)
//  * @returns {Date} Date 객체
//  */
// export const timeStringToDate = (timeString, baseDate = new Date()) => {
//   const [hour, minute] = timeString.split(':').map(Number);
//   const date = new Date(baseDate);
//   date.setHours(hour, minute, 0, 0);
//   return date;
// };

// /**
//  * 두 시간 사이의 겹침 여부 확인
//  * @param {string} start1 - 첫 번째 시작 시간
//  * @param {number} duration1 - 첫 번째 소요시간
//  * @param {string} start2 - 두 번째 시작 시간
//  * @param {number} duration2 - 두 번째 소요시간
//  * @returns {boolean} 겹치면 true
//  */
// export const isTimeOverlapping = (start1, duration1, start2, duration2) => {
//   const end1 = getEndTime(start1, duration1);
//   const end2 = getEndTime(start2, duration2);
  
//   // 시간을 분으로 변환
//   const toMinutes = (timeStr) => {
//     const [h, m] = timeStr.split(':').map(Number);
//     return h * 60 + m;
//   };
  
//   const start1Min = toMinutes(start1);
//   const end1Min = toMinutes(end1);
//   const start2Min = toMinutes(start2);
//   const end2Min = toMinutes(end2);
  
//   return !(end1Min <= start2Min || end2Min <= start1Min);
// };

// // ========== ✅ 새로 추가: 시간대 처리 함수들 ==========

// /**
//  * 서버에서 받은 시간을 한국 시간으로 올바르게 표시
//  * @param {string} serverTime - 서버에서 받은 시간 문자열
//  * @returns {string} 한국 시간 형식으로 변환된 문자열
//  */
// export const formatServerTimeToKST = (serverTime) => {
//   if (!serverTime) return '';
  
//   console.log('🔍 원본 서버 시간:', serverTime);
  
//   try {
//     // 서버에서 받은 시간 문자열을 Date 객체로 변환
//     const date = new Date(serverTime);
//     console.log('🔍 Date 객체 변환:', date);
//     console.log('🔍 브라우저 로컬 시간:', date.toLocaleString());
    
//     // 한국 시간대로 명시적 변환
//     const kstOptions = {
//       timeZone: 'Asia/Seoul',
//       year: 'numeric',
//       month: '2-digit',
//       day: '2-digit',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: false
//     };
    
//     const kstString = date.toLocaleString('ko-KR', kstOptions);
//     console.log('🔍 KST 변환 결과:', kstString);
    
//     return kstString;
//   } catch (error) {
//     console.error('시간 변환 오류:', error);
//     return serverTime;
//   }
// };

// /**
//  * input[type="datetime-local"]에 사용할 형식으로 변환
//  * @param {string} serverTime - 서버에서 받은 시간 문자열
//  * @returns {string} "YYYY-MM-DDTHH:MM" 형식의 문자열
//  */
// export const formatForDateTimeInput = (serverTime) => {
//   if (!serverTime) return '';
  
//   try {
//     const date = new Date(serverTime);
    
//     // 한국 시간대 기준으로 변환
//     const kstDate = new Date(date.toLocaleString("ko-KR", {timeZone: "Asia/Seoul"}));
    
//     // "YYYY-MM-DDTHH:MM" 형식으로 변환
//     const year = kstDate.getFullYear();
//     const month = String(kstDate.getMonth() + 1).padStart(2, '0');
//     const day = String(kstDate.getDate()).padStart(2, '0');
//     const hours = String(kstDate.getHours()).padStart(2, '0');
//     const minutes = String(kstDate.getMinutes()).padStart(2, '0');
    
//     const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
//     console.log('🔍 Input 형식 변환:', serverTime, '→', formatted);
    
//     return formatted;
//   } catch (error) {
//     console.error('Input 형식 변환 오류:', error);
//     return '';
//   }
// };

// /**
//  * 현재 한국 시간을 input 형식으로 반환
//  * @returns {string} "YYYY-MM-DDTHH:MM" 형식의 현재 KST 시간
//  */
// export const getCurrentKSTForInput = () => {
//   const now = new Date();
//   const kstNow = new Date(now.toLocaleString("ko-KR", {timeZone: "Asia/Seoul"}));
  
//   const year = kstNow.getFullYear();
//   const month = String(kstNow.getMonth() + 1).padStart(2, '0');
//   const day = String(kstNow.getDate()).padStart(2, '0');
//   const hours = String(kstNow.getHours()).padStart(2, '0');
//   const minutes = String(kstNow.getMinutes()).padStart(2, '0');
  
//   return `${year}-${month}-${day}T${hours}:${minutes}`;
// };

// /**
//  * KST 시간을 ISO 문자열로 변환 (명시적 타임존 포함)
//  * @param {string} dateTimeString - "YYYY-MM-DDTHH:MM" 형식의 시간
//  * @returns {string} KST 타임존이 포함된 ISO 문자열
//  */
// export const toKSTISO = (dateTimeString) => {
//   if (!dateTimeString) return null;
  
//   // "2025-06-26T12:03" 형태를 "2025-06-26T12:03:00+09:00" 형태로 변환
//   if (dateTimeString.length === 16) { // "YYYY-MM-DDTHH:MM" 형태
//     return dateTimeString + ':00+09:00'; // KST 명시적 지정
//   }
  
//   // 이미 타임존이 있다면 그대로 반환
//   if (dateTimeString.includes('+') || dateTimeString.includes('Z')) {
//     return dateTimeString;
//   }
  
//   // 초가 없다면 추가하고 KST 타임존 붙이기
//   return dateTimeString + '+09:00';
// };

// /**
//  * 디버깅용: 모든 시간 정보 출력
//  * @param {string} serverTime - 서버에서 받은 시간
//  * @param {string} label - 디버깅 라벨
//  */
// export const debugTime = (serverTime, label = '') => {
//   if (!serverTime) {
//     console.log(`🕐 [${label}] 시간 없음`);
//     return;
//   }
  
//   const date = new Date(serverTime);
  
//   console.log(`🕐 [${label}] 시간 디버깅:`);
//   console.log('  원본:', serverTime);
//   console.log('  Date 객체:', date);
//   console.log('  브라우저 로컬:', date.toLocaleString());
//   console.log('  UTC:', date.toISOString());
//   console.log('  KST 명시적:', date.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}));
//   console.log('  Input 형식:', formatForDateTimeInput(serverTime));
// };

// /**
//  * 현재 KST 시간을 ISO 문자열로 반환
//  * @returns {string} KST 타임존이 포함된 현재 시간 ISO 문자열
//  */
// export const nowKST = () => {
//   const now = new Date();
//   const kstOffset = 9 * 60; // KST는 UTC+9
//   const kstTime = new Date(now.getTime() + kstOffset * 60000);
//   return kstTime.toISOString().slice(0, -1) + '+09:00';
// };

// /**
//  * 날짜 문자열을 KST 기준으로 변환
//  * @param {string} dateString - "YYYY-MM-DD" 형식의 날짜
//  * @returns {string} KST 타임존이 포함된 ISO 문자열
//  */
// export const dateToKST = (dateString) => {
//   if (!dateString) return null;
//   // "2025-06-26" 형태를 "2025-06-26T00:00:00+09:00" 형태로
//   return dateString + 'T00:00:00+09:00';
// };

// /**
//  * 오늘 날짜를 KST 기준으로 반환
//  * @returns {string} "YYYY-MM-DD" 형식의 오늘 날짜 (KST 기준)
//  */
// export const getTodayKST = () => {
//   const now = new Date();
//   const kstOffset = 9 * 60; // 9시간 = 540분
//   const kstNow = new Date(now.getTime() + kstOffset * 60000);
//   return kstNow.toISOString().split('T')[0]; // "2025-06-26" 형태
// };

// utils/timeUtils.js - timezone 처리 완전 수정

/**
 * KST 기준 현재 날짜를 YYYY-MM-DD 형식으로 반환
 */
export const getTodayKST = () => {
  const now = new Date();
  const kstDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 로컬 시간을 KST timezone을 명시한 ISO 문자열로 변환
 * React에서 Django로 보낼 때 사용
 */
export const formatDateTimeForServer = (dateTimeValue) => {
  if (!dateTimeValue) return null;
  
  // datetime-local input 값을 그대로 사용 (timezone 변환 X)
  if (typeof dateTimeValue === 'string') {
    // "YYYY-MM-DDTHH:mm" 형태라면 그대로 반환
    if (dateTimeValue.includes('T') && dateTimeValue.length === 16) {
      return dateTimeValue + ':00'; // 초 단위만 추가
    }
    
    // 이미 완전한 ISO 형태라면 그대로 반환
    return dateTimeValue;
  }
  
  // 문자열인 경우 처리
  if (typeof dateTimeValue === 'string') {
    // "YYYY-MM-DDTHH:mm" 형태의 datetime-local 값인 경우
    if (dateTimeValue.includes('T') && dateTimeValue.length === 16) {
      // 로컬 시간으로 해석하고 KST로 변환
      const localDate = new Date(dateTimeValue);
      return formatDateToKST(localDate);
    }
    
    // ISO 문자열인 경우
    if (dateTimeValue.includes('Z') || dateTimeValue.includes('+')) {
      const date = new Date(dateTimeValue);
      return formatDateToKST(date);
    }
    
    // 일반 날짜 문자열인 경우
    const date = new Date(dateTimeValue);
    return formatDateToKST(date);
  }
  
  return null;
};

/**
 * Date 객체를 KST timezone이 명시된 ISO 문자열로 변환
 */
const formatDateToKST = (date) => {
  // 한국 시간대로 변환
  const kstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  
  const year = kstDate.getFullYear();
  const month = String(kstDate.getMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getDate()).padStart(2, '0');
  const hours = String(kstDate.getHours()).padStart(2, '0');
  const minutes = String(kstDate.getMinutes()).padStart(2, '0');
  const seconds = String(kstDate.getSeconds()).padStart(2, '0');
  
  // KST timezone 명시: +09:00
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+09:00`;
};

/**
 * 서버에서 받은 datetime 문자열을 React에서 표시할 KST 시간으로 변환
 */
export const formatServerTimeToKST = (serverDateTime) => {
  if (!serverDateTime) return '';
  
  try {
    const date = new Date(serverDateTime);
    
    // KST로 변환하여 표시
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('날짜 변환 오류:', error);
    return serverDateTime;
  }
};

/**
 * 서버에서 받은 datetime을 datetime-local input에 사용할 형식으로 변환
 */
export const formatForDateTimeInput = (serverDateTime) => {
  if (!serverDateTime) return '';
  
  try {
    const date = new Date(serverDateTime);
    
    // KST 시간으로 변환
    const kstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    
    const year = kstDate.getFullYear();
    const month = String(kstDate.getMonth() + 1).padStart(2, '0');
    const day = String(kstDate.getDate()).padStart(2, '0');
    const hours = String(kstDate.getHours()).padStart(2, '0');
    const minutes = String(kstDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Input 형식 변환 오류:', error);
    return '';
  }
};

/**
 * 시간 문자열에서 HH:MM 형식만 추출
 */
export const extractTimeFromDateTime = (dateTimeString) => {
  if (!dateTimeString) return '';
  
  try {
    const date = new Date(dateTimeString);
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('시간 추출 오류:', error);
    return '';
  }
};

/**
 * 검사 종료 시간 계산
 */
export const getEndTime = (startTime, durationMinutes) => {
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  } catch (error) {
    console.error('종료 시간 계산 오류:', error);
    return startTime;
  }
};


/**
 * 시간대 디버깅 함수
 */
export const debugTime = (dateTime, label = '') => {
  if (!dateTime) {
    console.log(`🕐 [${label}] 값이 없음`);
    return;
  }
  
  const date = new Date(dateTime);
  const kstDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  
  console.log(`🕐 [${label}] 시간 정보:`);
  console.log(`  원본: ${dateTime}`);
  console.log(`  UTC: ${date.toISOString()}`);
  console.log(`  KST: ${kstDate.toLocaleString('ko-KR')}`);
  console.log(`  서버용: ${formatDateTimeForServer(dateTime)}`);
  console.log(`  Input용: ${formatForDateTimeInput(dateTime)}`);
};

// 개발환경에서 전역 노출
if (process.env.NODE_ENV === 'development') {
  window.timeUtils = {
    getTodayKST,
    formatDateTimeForServer,
    formatServerTimeToKST,
    formatForDateTimeInput,
    extractTimeFromDateTime,
    getEndTime,
    debugTime
  };
  console.log('🔧 timeUtils가 window.timeUtils로 노출됨');
}