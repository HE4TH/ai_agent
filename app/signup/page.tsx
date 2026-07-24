'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? '회원가입에 실패했습니다');
        return;
      }

      router.push('/login');
    } catch {
      setError('회원가입에 실패했습니다');
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
            회원가입
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-col gap-3 rounded-[10px] border bg-white px-4 py-4"
          style={{ borderColor: '#e8e4d9' }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: '#2b2a26' }}>
              이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="rounded-[10px] border px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#e8e4d9', color: '#2b2a26' }}
            />
          </div>

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
              minLength={8}
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
            {submitting ? '가입 중...' : '가입하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
