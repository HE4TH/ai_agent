'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import {
  IconCalendar,
  IconLogout,
  IconMessageCircle,
  IconMicrophone,
  IconX,
  type Icon,
} from '@tabler/icons-react';
import * as TablerIcons from '@tabler/icons-react';
import { signOut } from 'next-auth/react';
import CalendarPanel from '@/components/CalendarPanel';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type SuggestedQuestion = {
  text: string;
  icon: string;
  category: string;
};

function toIconComponentName(iconName: string): string {
  const withoutPrefix = iconName.replace(/^Icon/, '');
  const pascalCase = withoutPrefix
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return `Icon${pascalCase}`;
}

function getIconComponent(iconName: string): Icon {
  const icons = TablerIcons as unknown as Record<string, Icon>;
  return icons[toIconComponentName(iconName)] ?? IconMessageCircle;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    fetch('/api/suggested-questions')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSuggestedQuestions(data);
        }
      })
      .catch(() => {});
  }, []);

  const sendMessage = async (overrideText?: string) => {
    const message = (overrideText ?? input).trim();
    if (!message || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: message }];

    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/router-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.error ?? '오류가 발생했습니다.';

      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);

      if (data.category === 'reservation') {
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="flex" style={{ height: '100vh', backgroundColor: '#f7f3e9' }}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <header
          className="flex shrink-0 items-center justify-between border-b px-8 py-5"
          style={{ borderColor: '#e8e4d9' }}
        >
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-3.5 w-3.5 rounded-full"
              style={{ backgroundColor: '#d97757' }}
            />
            <h1 className="text-lg font-medium" style={{ color: '#2b2a26' }}>
              예약 도우미
            </h1>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPanelOpen((prev) => !prev)}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors hover:bg-black/5"
              aria-label="예약 목록 보기"
            >
              <IconCalendar size={22} color="#d97757" stroke={1.75} />
            </button>
            <button
              onClick={() => router.push('/meeting-notes')}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors hover:bg-black/5"
              aria-label="회의록 작성"
              title="회의록 작성"
            >
              <IconMicrophone size={22} color="#d97757" stroke={1.75} />
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors hover:bg-black/5"
              aria-label="로그아웃"
            >
              <IconLogout size={22} color="#2b2a26" stroke={1.75} />
            </button>
          </div>
        </header>

        <main
          className="flex flex-col gap-6 px-8 py-8"
          style={{ flex: 1, overflowY: 'auto' }}
        >
          {messages.length === 0 && suggestedQuestions.length > 0 && (
            <div className="mx-auto grid w-full max-w-[560px] grid-cols-1 gap-2 sm:grid-cols-2">
              {suggestedQuestions.map((question, index) => {
                const QuestionIcon = getIconComponent(question.icon);
                return (
                  <button
                    key={index}
                    onClick={() => sendMessage(question.text)}
                    className="flex items-center gap-3 rounded-[10px] border bg-white px-4 py-3 text-left text-sm transition-colors hover:bg-black/5"
                    style={{ borderColor: '#e8e4d9', color: '#2b2a26' }}
                  >
                    <QuestionIcon size={18} color="#d97757" stroke={1.75} />
                    {question.text}
                  </button>
                );
              })}
            </div>
          )}

          {messages.map((message, index) =>
            message.role === 'user' ? (
              <div key={index} className="flex justify-end">
                <div
                  className="max-w-[70%] px-5 py-3 text-base"
                  style={{
                    backgroundColor: '#45443f',
                    color: '#f7f3e9',
                    borderRadius: '14px 14px 3px 14px',
                  }}
                >
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={index} className="flex justify-start">
                <div
                  className="max-w-[70%] text-base"
                  style={{
                    color: '#2b2a26',
                    fontFamily: "'Georgia', 'Noto Serif KR', serif",
                    lineHeight: 1.7,
                  }}
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-2 mt-3 text-lg font-bold first:mt-0">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h2>
                      ),
                      ul: ({ children }) => (
                        <ul className="my-1 list-disc pl-5">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="my-1 list-decimal pl-5">{children}</ol>
                      ),
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            )
          )}

          {loading && (
            <div className="flex justify-start">
              <p
                className="text-base"
                style={{
                  color: '#2b2a26',
                  fontFamily: "'Georgia', 'Noto Serif KR', serif",
                }}
              >
                입력 중...
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        <footer className="shrink-0 px-8 py-6">
          <div
            className="mx-auto flex max-w-[720px] items-center gap-2 rounded-[10px] border bg-white px-4 py-3"
            style={{ borderColor: '#e8e4d9' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-transparent text-base outline-none"
              style={{ color: '#2b2a26' }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: '#d97757' }}
              aria-label="전송"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </footer>
      </div>

      <aside
        className="shrink-0 overflow-hidden border-l bg-white"
        style={{
          borderColor: '#e8e4d9',
          width: panelOpen ? '300px' : '0px',
          transition: 'width 300ms ease',
        }}
      >
        <div className="flex h-full flex-col" style={{ width: '300px' }}>
          <div
            className="flex shrink-0 items-center justify-between border-b px-4 py-4"
            style={{ borderColor: '#e8e4d9' }}
          >
            <h2 className="text-sm font-medium" style={{ color: '#2b2a26' }}>
              예약 목록
            </h2>
            <button
              onClick={() => setPanelOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-colors hover:bg-black/5"
              aria-label="닫기"
            >
              <IconX size={16} color="#2b2a26" stroke={1.75} />
            </button>
          </div>

          <div className="overflow-y-auto px-4 py-4" style={{ flex: 1 }}>
            <CalendarPanel refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </aside>
    </div>
  );
}
