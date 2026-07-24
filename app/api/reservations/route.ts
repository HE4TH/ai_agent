import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const EXCLUSION_VIOLATION = '23P01';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const resourceId = searchParams.get('resource_id');
  const userId = searchParams.get('user_id');

  let query = supabase.from('reservations').select('*');

  if (resourceId) {
    query = query.eq('resource_id', resourceId);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { resource_id, user_id, start_time, end_time } = body;

  if (!resource_id || !user_id || !start_time || !end_time) {
    return NextResponse.json(
      { error: 'resource_id, user_id, start_time, end_time은 필수입니다' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('reservations')
    .insert({ resource_id, user_id, start_time, end_time })
    .select()
    .single();

  if (error) {
    if (error.code === EXCLUSION_VIOLATION) {
      return NextResponse.json(
        { error: '해당 시간대는 이미 예약되어 있습니다' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
