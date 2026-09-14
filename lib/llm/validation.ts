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
