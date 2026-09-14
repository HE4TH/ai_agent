import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return Response.json({ error: '관리자만 사용할 수 있습니다' }, { status: 403 });
  }

  const { reservation_id } = (await request.json()) as { reservation_id?: string };

  if (!reservation_id) {
    return Response.json({ error: 'reservation_id가 필요합니다' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ status: 'no_show' })
    .eq('id', reservation_id)
    .eq('status', 'confirmed')
    .select('id')
    .single();

  if (error || !data) {
    return Response.json(
      { error: '해당 예약을 노쇼로 표시하지 못했습니다 (이미 처리되었거나 존재하지 않음)' },
      { status: 400 }
    );
  }

  return Response.json({ success: true });
}
