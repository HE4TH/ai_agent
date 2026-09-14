export function isOnHalfHourBoundary(time: string): boolean {
  const minute = Number(time.split(':')[1]);
  return minute === 0 || minute === 30;
}

export function isWeekday(dateString: string): boolean {
  const day = new Date(`${dateString}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

export function isWithinOperatingHours(
  startTime: string,
  endTime: string,
  openingTime: string,
  closingTime: string
): boolean {
  return startTime >= openingTime && endTime <= closingTime;
}

export const NO_SHOW_RESTRICTION_THRESHOLD = 2;
export const NO_SHOW_RESTRICTION_DAYS = 7;

// 노쇼가 threshold회 이상 누적되면, 가장 최근 노쇼로부터 restrictionDays일간 예약을 제한한다.
export function getNoShowRestrictionEnd(
  noShowCount: number,
  mostRecentNoShowTime: string
): Date | null {
  if (noShowCount < NO_SHOW_RESTRICTION_THRESHOLD) {
    return null;
  }

  return new Date(
    new Date(mostRecentNoShowTime).getTime() + NO_SHOW_RESTRICTION_DAYS * 24 * 60 * 60 * 1000
  );
}
