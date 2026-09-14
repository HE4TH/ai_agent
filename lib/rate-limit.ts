import { supabaseAdmin } from '@/lib/supabase-admin';

const WINDOW_SECONDS = 60;
const MAX_REQUESTS_PER_WINDOW = 20;

export async function checkRateLimit(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('check_rate_limit', {
    p_user_id: userId,
    p_window_seconds: WINDOW_SECONDS,
    p_max_requests: MAX_REQUESTS_PER_WINDOW,
  });

  if (error) {
    return true;
  }

  return data as boolean;
}
