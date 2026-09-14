import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { estimateCostUsd } from '@/lib/llm/pricing';

const PAGE_SIZE = 1000;

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    return Response.json({ error: '관리자만 사용할 수 있습니다' }, { status: 403 });
  }

  const rows: { request_type: string; model: string; input_tokens: number | null; output_tokens: number | null; created_at: string }[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from('llm_logs')
      .select('request_type, model, input_tokens, output_tokens, created_at')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      return Response.json({ error: `조회 실패: ${error.message}` }, { status: 500 });
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) break;
  }

  const byModel = new Map<
    string,
    { count: number; inputTokens: number; outputTokens: number }
  >();

  for (const row of rows) {
    const agg = byModel.get(row.model) ?? { count: 0, inputTokens: 0, outputTokens: 0 };
    agg.count += 1;
    agg.inputTokens += row.input_tokens ?? 0;
    agg.outputTokens += row.output_tokens ?? 0;
    byModel.set(row.model, agg);
  }

  const models = [...byModel.entries()].map(([model, agg]) => ({
    model,
    ...agg,
    estimatedCostUsd: estimateCostUsd(model, agg.inputTokens, agg.outputTokens),
  }));

  const totalEstimatedCostUsd = models.reduce(
    (sum, m) => sum + (m.estimatedCostUsd ?? 0),
    0
  );

  const timestamps = rows.map((r) => r.created_at).sort();

  return Response.json({
    totalRequests: rows.length,
    models,
    totalEstimatedCostUsd,
    oldestLogAt: timestamps[0] ?? null,
    newestLogAt: timestamps[timestamps.length - 1] ?? null,
  });
}
