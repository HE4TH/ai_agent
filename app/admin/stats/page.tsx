'use client';

import { useEffect, useState } from 'react';

type ModelStat = {
  model: string;
  count: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number | null;
};

type StatsResponse = {
  totalRequests: number;
  models: ModelStat[];
  totalEstimatedCostUsd: number;
  oldestLogAt: string | null;
  newestLogAt: string | null;
};

function formatDateTime(isoString: string) {
  return new Date(isoString).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? '조회 실패');
        }
        setStats(data);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '조회 실패'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f3e9' }}>
      <div className="mx-auto flex max-w-[640px] flex-col px-4 py-8">
        <div className="mb-6 flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#d97757' }}
          />
          <h1 className="text-lg font-medium" style={{ color: '#2b2a26' }}>
            LLM 사용량 / 비용 (관리자)
          </h1>
        </div>

        {loading && (
          <p className="text-sm" style={{ color: '#2b2a26' }}>
            불러오는 중...
          </p>
        )}

        {error && (
          <p className="text-sm" style={{ color: '#b3432b' }}>
            {error}
          </p>
        )}

        {stats && (
          <div className="flex flex-col gap-6">
            <div
              className="rounded-[10px] border bg-white px-4 py-3"
              style={{ borderColor: '#e8e4d9' }}
            >
              <p className="text-sm" style={{ color: '#2b2a26' }}>
                총 요청 {stats.totalRequests.toLocaleString()}건 · 추정 비용{' '}
                <strong>${stats.totalEstimatedCostUsd.toFixed(4)}</strong>
              </p>
              {stats.oldestLogAt && stats.newestLogAt && (
                <p className="mt-1 text-xs" style={{ color: '#6b6a63' }}>
                  {formatDateTime(stats.oldestLogAt)} ~ {formatDateTime(stats.newestLogAt)}
                </p>
              )}
            </div>

            <div className="overflow-x-auto rounded-[10px] border bg-white" style={{ borderColor: '#e8e4d9' }}>
              <table className="w-full text-sm" style={{ color: '#2b2a26' }}>
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: '#e8e4d9' }}>
                    <th className="px-4 py-2 font-medium">모델</th>
                    <th className="px-4 py-2 font-medium">호출 수</th>
                    <th className="px-4 py-2 font-medium">입력 토큰</th>
                    <th className="px-4 py-2 font-medium">출력 토큰</th>
                    <th className="px-4 py-2 font-medium">추정 비용</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.models.map((m) => (
                    <tr key={m.model} className="border-b last:border-0" style={{ borderColor: '#e8e4d9' }}>
                      <td className="px-4 py-2">{m.model}</td>
                      <td className="px-4 py-2">{m.count.toLocaleString()}</td>
                      <td className="px-4 py-2">{m.inputTokens.toLocaleString()}</td>
                      <td className="px-4 py-2">{m.outputTokens.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        {m.estimatedCostUsd === null ? '알 수 없음' : `$${m.estimatedCostUsd.toFixed(4)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs" style={{ color: '#6b6a63' }}>
              추정 비용은 임베딩(RAG 검색)·Whisper STT 호출은 포함하지 않으며, 수동으로 반영한
              모델 단가 기준의 근사치입니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
