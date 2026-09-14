import { supabaseAdmin } from '@/lib/supabase-admin';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function checkRateLimit(userId: string): Promise<boolean> {
  const now = new Date();

  const { data: row } = await supabaseAdmin
    .from('rate_limits')
    .select('window_start, request_count')
    .eq('user_id', userId)
    .single();

  if (!row || now.getTime() - new Date(row.window_start).getTime() > WINDOW_MS) {
    await supabaseAdmin
      .from('rate_limits')
      .upsert({ user_id: userId, window_start: now.toISOString(), request_count: 1 });
    return true;
  }

  if (row.request_count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  await supabaseAdmin
    .from('rate_limits')
    .update({ request_count: row.request_count + 1 })
    .eq('user_id', userId);

  return true;
}
