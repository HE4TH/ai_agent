import Link from 'next/link';
import { auth } from '@/auth';

export default async function Home() {
  const session = await auth();
  const startHref = session ? '/chat' : '/login';

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#f7f3e9' }}
    >
      <div className="flex max-w-[480px] flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#d97757' }}
          />
          <h1 className="text-xl font-medium" style={{ color: '#2b2a26' }}>
            예약 도우미
          </h1>
        </div>

        <p
          className="text-base leading-7"
          style={{
            color: '#6b6a63',
            fontFamily: "'Georgia', 'Noto Serif KR', serif",
          }}
        >
          자연어로 회의실을 예약하고, 이용 규정을 물어보세요.
          <br />
          채팅 한 번으로 예약부터 확인까지 끝낼 수 있어요.
        </p>

        <Link
          href={startHref}
          className="mt-2 rounded-[10px] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#d97757' }}
        >
          시작하기
        </Link>
      </div>
    </div>
  );
}
