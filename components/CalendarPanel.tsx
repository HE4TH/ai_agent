'use client';

import { useEffect, useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

type Resource = {
  id: string;
  name: string;
};

type Reservation = {
  id: string;
  resource_id: string;
  user_id: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toKSTDateKey(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

function formatKSTTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

type CalendarPanelProps = {
  refreshTrigger?: number;
};

export default function CalendarPanel({ refreshTrigger = 0 }: CalendarPanelProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetch('/api/reservations').then((res) => res.json()),
      fetch('/api/resources').then((res) => res.json()),
    ])
      .then(([reservationData, resourceData]) => {
        setReservations(Array.isArray(reservationData) ? reservationData : []);
        setResources(Array.isArray(resourceData) ? resourceData : []);
      })
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const resourceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const resource of resources) {
      map.set(resource.id, resource.name);
    }
    return map;
  }, [resources]);

  const reservationsByDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const reservation of reservations) {
      const key = toKSTDateKey(reservation.start_time);
      const existing = map.get(key);
      if (existing) {
        existing.push(reservation);
      } else {
        map.set(key, [reservation]);
      }
    }
    return map;
  }, [reservations]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ day: number; key: string } | null> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ day, key: dateKey(viewYear, viewMonth, day) });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goToPreviousMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 0) {
      setViewYear((year) => year - 1);
      setViewMonth(11);
    } else {
      setViewMonth((month) => month - 1);
    }
  };

  const goToNextMonth = () => {
    setSelectedDate(null);
    if (viewMonth === 11) {
      setViewYear((year) => year + 1);
      setViewMonth(0);
    } else {
      setViewMonth((month) => month + 1);
    }
  };

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedReservations = selectedDate ? (reservationsByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="flex flex-col gap-4" style={{ color: '#2b2a26' }}>
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-black/5"
          aria-label="이전 달"
        >
          <IconChevronLeft size={16} color="#2b2a26" stroke={1.75} />
        </button>
        <span className="text-sm font-medium">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          onClick={goToNextMonth}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-black/5"
          aria-label="다음 달"
        >
          <IconChevronRight size={16} color="#2b2a26" stroke={1.75} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs" style={{ color: '#6b6a63' }}>
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell, index) => {
          if (!cell) {
            return <div key={`blank-${index}`} />;
          }

          const hasReservations = reservationsByDate.has(cell.key);
          const isSelected = selectedDate === cell.key;
          const isToday = cell.key === todayKey;

          return (
            <button
              key={cell.key}
              onClick={() => setSelectedDate(isSelected ? null : cell.key)}
              className="flex flex-col items-center gap-0.5 rounded-[8px] py-1.5 text-xs transition-colors"
              style={{
                backgroundColor: isSelected ? '#d97757' : hasReservations ? '#f0e6da' : 'transparent',
                color: isSelected ? '#f7f3e9' : '#2b2a26',
                fontWeight: isToday ? 700 : 400,
              }}
            >
              <span>{cell.day}</span>
              {hasReservations && (
                <span
                  className="h-1 w-1 rounded-full"
                  style={{ backgroundColor: isSelected ? '#f7f3e9' : '#d97757' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 border-t pt-3" style={{ borderColor: '#e8e4d9' }}>
        {loading ? (
          <p className="text-xs" style={{ color: '#6b6a63' }}>
            불러오는 중...
          </p>
        ) : !selectedDate ? (
          <p className="text-xs" style={{ color: '#6b6a63' }}>
            날짜를 선택하면 예약 목록을 볼 수 있습니다
          </p>
        ) : selectedReservations.length === 0 ? (
          <p className="text-xs" style={{ color: '#6b6a63' }}>
            선택한 날짜에 예약 내역이 없습니다
          </p>
        ) : (
          selectedReservations.map((reservation) => (
            <div
              key={reservation.id}
              className="rounded-[8px] border px-3 py-2"
              style={{ borderColor: '#e8e4d9' }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {resourceNameById.get(reservation.resource_id) ?? '알 수 없는 자원'}
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={
                    reservation.status === 'confirmed'
                      ? { backgroundColor: '#dcefdd', color: '#2f6b34' }
                      : { backgroundColor: '#e8e4d9', color: '#6b6a63' }
                  }
                >
                  {reservation.status === 'confirmed' ? '확정' : '취소됨'}
                </span>
              </div>
              <p className="text-xs" style={{ color: '#6b6a63' }}>
                {formatKSTTime(reservation.start_time)} ~ {formatKSTTime(reservation.end_time)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
