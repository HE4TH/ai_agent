import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SAMPLE_SIZE = 4;

export async function GET() {
  const { data, error } = await supabase.from('suggested_questions').select('text, icon, category');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sample = [...data].sort(() => Math.random() - 0.5).slice(0, SAMPLE_SIZE);

  return NextResponse.json(sample);
}
