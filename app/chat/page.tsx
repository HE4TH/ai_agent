'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async () => {
    const message = input.trim();
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
    <div
      className="flex justify-center"
      style={{ height: '100vh', backgroundColor: '#f7f3e9' }}
    >
      <div className="flex w-full max-w-[480px] flex-col" style={{ height: '100vh' }}>
        <header
          className="flex shrink-0 items-center gap-2 border-b px-4 py-4"
          style={{ borderColor: '#e8e4d9' }}
        >
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#d97757' }}
          />
          <h1 className="text-base font-medium" style={{ color: '#2b2a26' }}>
            예약 도우미
          </h1>
        </header>

        <main
          className="flex flex-col gap-4 px-4 py-6"
          style={{ flex: 1, overflowY: 'auto' }}
        >
          {messages.map((message, index) =>
            message.role === 'user' ? (
              <div key={index} className="flex justify-end">
                <div
                  className="max-w-[80%] px-4 py-2 text-sm"
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
                  className="max-w-[90%] text-sm"
                  style={{
                    color: '#2b2a26',
                    fontFamily: "'Georgia', 'Noto Serif KR', serif",
                    lineHeight: 1.6,
                  }}
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="mb-2 mt-3 text-[15px] font-bold first:mt-0">{children}</h2>
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
                className="text-sm"
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

        <footer className="shrink-0 px-4 py-4">
          <div
            className="flex items-center gap-2 rounded-[10px] border bg-white px-3 py-2"
            style={{ borderColor: '#e8e4d9' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: '#2b2a26' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: '#d97757' }}
              aria-label="전송"
            >
              <svg
                width="16"
                height="16"
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
    </div>
  );
}
