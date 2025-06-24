// contexts/DoctorContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { doctorService } from '../services/doctorService';
import { scheduleService } from '../services/scheduleService'; // 🆕 추가

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
  
  // 🆕 일정 관련 상태들
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [scheduleRefreshTrigger, setScheduleRefreshTrigger] = useState(0);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    fetchDoctorData();
  }, []);

  useEffect(() => {
    // 🆕 일정 새로고침 트리거 변경 시 오늘 일정 재조회
    if (doctor) {
      fetchTodaySchedules();
    }
  }, [scheduleRefreshTrigger, doctor]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      const doctorData = await doctorService.getCurrentUser();
      setDoctor(doctorData);
      // 🆕 의사 정보 로드 후 오늘 일정도 조회
      fetchTodaySchedules();
    } catch (err) {
      setError('의사 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 🆕 오늘 개인일정 조회
  const fetchTodaySchedules = async () => {
    try {
      setSchedulesLoading(true);
      const schedules = await scheduleService.getTodayPersonalSchedules();
      setTodaySchedules(schedules);
    } catch (err) {
      console.error('오늘 일정 조회 실패:', err);
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

  // 🆕 일정 새로고침 함수
  const refreshSchedules = () => {
    setScheduleRefreshTrigger(prev => prev + 1);
  };

  // 🆕 개인일정 CRUD 함수들
  const createPersonalSchedule = async (scheduleData) => {
    try {
      const newSchedule = await scheduleService.createPersonalSchedule(scheduleData);
      refreshSchedules(); // 생성 후 새로고침
      return newSchedule;
    } catch (err) {
      throw err;
    }
  };

  const updatePersonalSchedule = async (scheduleId, scheduleData) => {
    try {
      const updatedSchedule = await scheduleService.updatePersonalSchedule(scheduleId, scheduleData);
      refreshSchedules(); // 수정 후 새로고침
      return updatedSchedule;
    } catch (err) {
      throw err;
    }
  };

  const deletePersonalSchedule = async (scheduleId) => {
    try {
      await scheduleService.deletePersonalSchedule(scheduleId);
      refreshSchedules(); // 삭제 후 새로고침
    } catch (err) {
      throw err;
    }
  };

  // 🆕 특정 날짜 일정 조회 (캘린더용)
  const getSchedulesByDate = async (date) => {
    try {
      const schedules = await scheduleService.getSchedulesByDate(date);
      return schedules;
    } catch (err) {
      console.error('날짜별 일정 조회 실패:', err);
      throw err;
    }
  };

  // 🆕 월별 일정 요약 조회 (캘린더 점 표시용)
  const getMonthSchedulesSummary = async (year, month) => {
    try {
      const summary = await scheduleService.getMonthSchedulesSummary(year, month);
      return summary;
    } catch (err) {
      console.error('월별 일정 요약 조회 실패:', err);
      throw err;
    }
  };

  const value = {
    // 기존 값들
    doctor,
    loading,
    error,
    updateDoctorStatus,
    
    // 🆕 일정 관련 값들
    todaySchedules,
    schedulesLoading,
    refreshSchedules,
    
    // 🆕 일정 CRUD 함수들
    createPersonalSchedule,
    updatePersonalSchedule,
    deletePersonalSchedule,
    getSchedulesByDate,
    getMonthSchedulesSummary,
  };

  return (
    <DoctorContext.Provider value={value}>
      {children}
    </DoctorContext.Provider>
  );
};