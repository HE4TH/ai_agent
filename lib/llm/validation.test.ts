import { describe, expect, it } from 'vitest';
import {
  getNoShowRestrictionEnd,
  isOnHalfHourBoundary,
  isWeekday,
  isWithinOperatingHours,
} from './validation';

describe('isOnHalfHourBoundary', () => {
  it('허용: 정각(00분)', () => {
    expect(isOnHalfHourBoundary('09:00')).toBe(true);
  });

  it('허용: 30분', () => {
    expect(isOnHalfHourBoundary('19:30')).toBe(true);
  });

  it('시(hour) 값과 무관하게 분(minute)만 본다', () => {
    expect(isOnHalfHourBoundary('23:00')).toBe(true);
  });

  it('거부: 15분처럼 30분 단위가 아닌 경우', () => {
    expect(isOnHalfHourBoundary('09:15')).toBe(false);
  });

  it('거부: 45분', () => {
    expect(isOnHalfHourBoundary('14:45')).toBe(false);
  });
});

describe('isWithinOperatingHours', () => {
  it('허용: 운영시간 내부', () => {
    expect(isWithinOperatingHours('09:00', '10:00', '09:00', '18:00')).toBe(true);
  });

  it('허용: 운영시간 경계와 정확히 일치', () => {
    expect(isWithinOperatingHours('09:00', '18:00', '09:00', '18:00')).toBe(true);
  });

  it('거부: 시작 시간이 운영 시작 이전', () => {
    expect(isWithinOperatingHours('08:30', '10:00', '09:00', '18:00')).toBe(false);
  });

  it('거부: 종료 시간이 운영 종료 이후', () => {
    expect(isWithinOperatingHours('17:00', '19:00', '09:00', '18:00')).toBe(false);
  });
});

describe('isWeekday', () => {
  it('평일(화요일)이면 true', () => {
    expect(isWeekday('2026-09-08')).toBe(true);
  });

  it('평일(금요일)이면 true', () => {
    expect(isWeekday('2026-09-11')).toBe(true);
  });

  it('토요일이면 false', () => {
    expect(isWeekday('2026-09-12')).toBe(false);
  });

  it('일요일이면 false', () => {
    expect(isWeekday('2026-09-13')).toBe(false);
  });

  it('서버 로컬 타임존과 무관하게 날짜 문자열 그대로의 요일을 판단한다', () => {
    // UTC 기준으로 파싱하므로, 로컬 타임존이 UTC-이든 UTC+이든 결과가 흔들리면 안 됨
    expect(isWeekday('2026-01-01')).toBe(true); // 2026-01-01은 목요일
  });
});

describe('getNoShowRestrictionEnd', () => {
  it('노쇼 1회면 제한 없음(null)', () => {
    expect(getNoShowRestrictionEnd(1, '2026-09-01T00:00:00Z')).toBeNull();
  });

  it('노쇼 2회 이상이면 가장 최근 노쇼로부터 7일 뒤를 반환', () => {
    const end = getNoShowRestrictionEnd(2, '2026-09-01T00:00:00Z');
    expect(end).not.toBeNull();
    expect(end!.toISOString()).toBe('2026-09-08T00:00:00.000Z');
  });

  it('노쇼가 더 많이 누적돼도(3회) 기준은 동일하게 최근 1건 기준', () => {
    const end = getNoShowRestrictionEnd(3, '2026-09-01T00:00:00Z');
    expect(end!.toISOString()).toBe('2026-09-08T00:00:00.000Z');
  });
});
