// contexts/DoctorContext.js
// KST 시간대 문제 해결 버전

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';
import { scheduleService } from '../services/scheduleService';

const DoctorContext = createContext();

export const useDoctor = () => {
  const context = useContext(DoctorContext);
  if (!context) {
    throw new Error('useDoctor must be used within a DoctorProvider');
  }
  return context;
};

export const DoctorProvider = ({ children }) => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 일정 관련 상태들
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [scheduleRefreshTrigger, setScheduleRefreshTrigger] = useState(0);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    // 일정 새로고침 트리거 변경 시 오늘 일정 재조회
    if (doctor) {
      fetchTodaySchedules();
    }
  }, [scheduleRefreshTrigger, doctor]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const doctorData = await doctorService.getCurrentUser();
      setDoctor(doctorData);
      // 의사 정보 로드 후 오늘 일정도 조회
      fetchTodaySchedules();
    } catch (err) {
      setError('의사 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 오늘 개인일정 조회 (KST 기준으로 수정)
  const fetchTodaySchedules = async () => {
    try {
      setSchedulesLoading(true);
      
      console.log('🕐 DoctorContext: 오늘 일정 조회 시작');
      
      // ✅ 방법 1: KST 기준 오늘 날짜로 명시적 조회 (추천)
      const today = scheduleService.getTodayKST();
      console.log('🕐 KST 기준 오늘 날짜:', today);
      
      const todayData = await scheduleService.getSchedulesByDate(today);
      const personalSchedules = todayData.personal_schedules || [];
      
      console.log('✅ 오늘 일정 조회 성공:', personalSchedules);
      console.log(`📊 조회된 일정 수: ${personalSchedules.length}개`);
      
      setTodaySchedules(personalSchedules);
      
      // ✅ 방법 2: 서버의 today_schedules도 함께 테스트 (비교용)
      try {
        const serverTodaySchedules = await scheduleService.getTodayPersonalSchedules();
        console.log('🔍 서버 today_schedules 비교:', serverTodaySchedules);
        console.log(`📊 서버 today_schedules 수: ${serverTodaySchedules.length}개`);
        
        // 만약 서버의 today_schedules가 더 정확하다면 이걸 사용
        // setTodaySchedules(serverTodaySchedules);
      } catch (serverError) {
        console.log('🔍 서버 today_schedules 조회 실패:', serverError);
      }
      
    } catch (err) {
      console.error('❌ 오늘 일정 조회 실패:', err);
      console.error('  에러 상세:', {
        message: err.message,
        status: err.response?.status,
        url: err.config?.url
      });
      
      // 에러 시 빈 배열로 설정
      setTodaySchedules([]);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const updateDoctorStatus = async (newStatus) => {
    try {
      const updatedDoctor = await doctorService.updateStatus(newStatus);
      setDoctor(prev => ({ ...prev, status: updatedDoctor.status }));
      return updatedDoctor;
    } catch (err) {
      throw err;
    }
  };

  // 일정 새로고침 함수
  const refreshSchedules = () => {
    console.log('🔄 일정 새로고침 트리거');
    setScheduleRefreshTrigger(prev => prev + 1);
  };

  // ✅ 개인일정 생성 (성공 후 새로고침)
  const createPersonalSchedule = async (scheduleData) => {
    try {
      console.log('📅 개인일정 생성 시작:', scheduleData);
      
      const newSchedule = await scheduleService.createPersonalSchedule(scheduleData);
      
      console.log('✅ 개인일정 생성 성공:', newSchedule);
      console.log('🔄 오늘 일정 새로고침 시작');
      
      // 생성 후 즉시 새로고침
      refreshSchedules();
      
      return newSchedule;
    } catch (err) {
      console.error('❌ 개인일정 생성 실패:', err);
      throw err;
    }
  };

  // 개인일정 수정
  const updatePersonalSchedule = async (scheduleId, scheduleData) => {
    try {
      console.log('📅 개인일정 수정 시작:', scheduleId, scheduleData);
      
      const updatedSchedule = await scheduleService.updatePersonalSchedule(scheduleId, scheduleData);
      
      console.log('✅ 개인일정 수정 성공:', updatedSchedule);
      refreshSchedules(); // 수정 후 새로고침
      
      return updatedSchedule;
    } catch (err) {
      console.error('❌ 개인일정 수정 실패:', err);
      throw err;
    }
  };

  // 개인일정 삭제
  const deletePersonalSchedule = async (scheduleId) => {
    try {
      console.log('📅 개인일정 삭제 시작:', scheduleId);
      
      await scheduleService.deletePersonalSchedule(scheduleId);
      
      console.log('✅ 개인일정 삭제 성공');
      refreshSchedules(); // 삭제 후 새로고침
      
    } catch (err) {
      console.error('❌ 개인일정 삭제 실패:', err);
      throw err;
    }
  };

  // ✅ 특정 날짜 일정 조회 (캘린더용)
  const getSchedulesByDate = async (date) => {
    try {
      console.log('📅 날짜별 일정 조회:', date);
      
      const schedules = await scheduleService.getSchedulesByDate(date);
      
      console.log('✅ 날짜별 일정 조회 성공:', schedules);
      return schedules;
    } catch (err) {
      console.error('❌ 날짜별 일정 조회 실패:', err);
      throw err;
    }
  };

  // 월별 일정 요약 조회 (캘린더 점 표시용)
  const getMonthSchedulesSummary = async (year, month) => {
    try {
      console.log('📅 월별 일정 요약 조회:', year, month);
      
      const summary = await scheduleService.getMonthSchedulesSummary(year, month);
      
      console.log('✅ 월별 일정 요약 조회 성공:', summary);
      return summary;
    } catch (err) {
      console.error('❌ 월별 일정 요약 조회 실패:', err);
      throw err;
    }
  };

  // ✅ 디버깅용 함수 추가
  const debugScheduleData = () => {
    console.log('🔍 DoctorContext 디버깅 정보:');
    console.log('  현재 의사:', doctor);
    console.log('  오늘 일정:', todaySchedules);
    console.log('  일정 로딩 상태:', schedulesLoading);
    console.log('  새로고침 트리거:', scheduleRefreshTrigger);
    console.log('  KST 오늘 날짜:', scheduleService.getTodayKST());
    
    return {
      doctor,
      todaySchedules,
      schedulesLoading,
      scheduleRefreshTrigger,
      kstToday: scheduleService.getTodayKST()
    };
  };

  const value = {
    // 기존 값들
    doctor,
    loading,
    error,
    updateDoctorStatus,
    
    // 일정 관련 값들
    todaySchedules,
    schedulesLoading,
    refreshSchedules,
    
    // 일정 CRUD 함수들
    createPersonalSchedule,
    updatePersonalSchedule,
    deletePersonalSchedule,
    getSchedulesByDate,
    getMonthSchedulesSummary,
    
    // ✅ 디버깅용 함수
    debugScheduleData,
  };

  return (
    <DoctorContext.Provider value={value}>
      {children}
    </DoctorContext.Provider>
  );
};

