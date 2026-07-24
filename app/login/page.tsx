'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다');
        return;
      }

      router.push('/chat');
    } catch {
      setError('로그인에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f3e9' }}>
      <div className="mx-auto flex max-w-[480px] flex-col px-4 py-8">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#d97757' }}
          />
          <h1 className="text-lg font-medium" style={{ color: '#2b2a26' }}>
            로그인
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-[10px] border bg-white px-4 py-4"
          style={{ borderColor: '#e8e4d9' }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: '#2b2a26' }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-[10px] border px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#e8e4d9', color: '#2b2a26' }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: '#2b2a26' }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-[10px] border px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#e8e4d9', color: '#2b2a26' }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#c0392b' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-[10px] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: '#d97757' }}
          >
            {submitting ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm" style={{ color: '#6b6a63' }}>
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-medium" style={{ color: '#d97757' }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
