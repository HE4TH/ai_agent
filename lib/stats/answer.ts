import { supabaseAdmin } from '@/lib/supabase-admin';

export async function answerStats(): Promise<string> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .select('resource_id, resources(name)')
    .gte('created_at', sevenDaysAgo);

  if (error) {
    throw new Error(`통계 조회 실패: ${error.message}`);
  }

  const totalCount = data.length;

  if (totalCount === 0) {
    return '이번 주에는 생성된 예약이 없습니다.';
  }

  const countByResource = new Map<string, { name: string; count: number }>();

  for (const reservation of data) {
    const resourceId = reservation.resource_id;
    const resourceName =
      (reservation.resources as unknown as { name: string } | null)?.name ?? '알 수 없는 자원';

    const existing = countByResource.get(resourceId);
    if (existing) {
      existing.count += 1;
    } else {
      countByResource.set(resourceId, { name: resourceName, count: 1 });
    }
  }

  const topResource = [...countByResource.values()].sort((a, b) => b.count - a.count)[0];

  return `이번 주(지난 7일) 동안 총 ${totalCount}건의 예약이 생성되었습니다. 가장 많이 예약된 자원은 '${topResource.name}'로, ${topResource.count}건 예약되었습니다.`;
}
