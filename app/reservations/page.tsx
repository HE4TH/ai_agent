'use client';

import { useEffect, useMemo, useState } from 'react';

type Resource = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  location: string | null;
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

function formatKSTTime(isoString: string) {
  return new Date(isoString).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatKSTDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ReservationsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/resources')
      .then((res) => res.json())
      .then((data) => setResources(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    setLoading(true);

    const url =
      selectedResourceId === 'all'
        ? '/api/reservations'
        : `/api/reservations?resource_id=${selectedResourceId}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => setReservations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [selectedResourceId]);

  const resourceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const resource of resources) {
      map.set(resource.id, resource.name);
    }
    return map;
  }, [resources]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f3e9' }}>
      <div className="mx-auto flex max-w-[480px] flex-col px-4 py-8">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#d97757' }}
          />
          <h1 className="text-lg font-medium" style={{ color: '#2b2a26' }}>
            예약 목록
          </h1>
        </div>

        <div
          className="mb-6 mt-4 rounded-[10px] border bg-white px-3 py-2"
          style={{ borderColor: '#e8e4d9' }}
        >
          <select
            value={selectedResourceId}
            onChange={(e) => setSelectedResourceId(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: '#2b2a26' }}
          >
            <option value="all">전체</option>
            {resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-sm" style={{ color: '#2b2a26' }}>
              불러오는 중...
            </p>
          ) : reservations.length === 0 ? (
            <p className="text-sm" style={{ color: '#2b2a26' }}>
              예약 내역이 없습니다
            </p>
          ) : (
            reservations.map((reservation) => (
              <div
                key={reservation.id}
                className="rounded-[10px] border bg-white px-4 py-3"
                style={{ borderColor: '#e8e4d9' }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: '#2b2a26' }}>
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
                <p className="text-sm" style={{ color: '#2b2a26' }}>
                  {formatKSTDate(reservation.start_time)} {formatKSTTime(reservation.start_time)}{' '}
                  ~ {formatKSTTime(reservation.end_time)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
