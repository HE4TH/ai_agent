'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { IconArrowLeft } from '@tabler/icons-react';

type MeetingNote = {
  id: string;
  raw_transcript: string;
  summary: string;
};

export default function MeetingNotesPage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [note, setNote] = useState<MeetingNote | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitAudio = async (audio: Blob, filename: string) => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', audio, filename);

      const res = await fetch('/api/meeting-notes', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '회의록 생성 중 오류가 발생했습니다');
      }

      setNote(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '회의록 생성 중 오류가 발생했습니다');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setNote(null);
    await submitAudio(file, file.name);
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setNote(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        await submitAudio(blob, 'recording.webm');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setErrorMessage('마이크에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f3e9' }}>
      <div className="mx-auto flex max-w-[720px] flex-col px-4 py-8">
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => router.push('/chat')}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors hover:bg-black/5"
            aria-label="채팅으로 돌아가기"
            title="채팅으로 돌아가기"
          >
            <IconArrowLeft size={22} color="#d97757" stroke={1.75} />
          </button>
          <h1 className="text-lg font-medium" style={{ color: '#2b2a26' }}>
            회의록
          </h1>
        </div>
        <p className="mb-6 text-sm" style={{ color: '#6b6a63' }}>
          녹음을 종료하거나 가지고 있는 녹음 파일을 업로드하면 음성을 텍스트로 변환하고 핵심 내용을 요약합니다
        </p>

        <div
          className="mb-6 flex items-center justify-between rounded-[10px] border bg-white px-4 py-3"
          style={{ borderColor: '#e8e4d9' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: isRecording ? '#d97757' : '#c7c3b6' }}
            />
            <span className="text-sm" style={{ color: '#2b2a26' }}>
              {isRecording ? '녹음 중...' : processing ? '요약 생성 중...' : '대기 중'}
            </span>
          </div>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={processing}
            className="rounded-[10px] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: isRecording ? '#45443f' : '#d97757' }}
          >
            {isRecording ? '녹음 종료' : '녹음 시작'}
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <span className="h-px flex-1" style={{ backgroundColor: '#e8e4d9' }} />
          <span className="text-xs" style={{ color: '#a6a296' }}>
            또는
          </span>
          <span className="h-px flex-1" style={{ backgroundColor: '#e8e4d9' }} />
        </div>

        <div
          className="mb-6 flex items-center justify-between rounded-[10px] border bg-white px-4 py-3"
          style={{ borderColor: '#e8e4d9' }}
        >
          <span className="text-sm" style={{ color: '#2b2a26' }}>
            가지고 있는 녹음 파일을 업로드해서 정리하기
          </span>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || processing}
            className="rounded-[10px] border px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ borderColor: '#d97757', color: '#d97757' }}
          >
            파일 업로드
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {errorMessage && (
          <div
            className="mb-6 rounded-[10px] border px-4 py-3 text-sm"
            style={{ borderColor: '#e8e4d9', backgroundColor: '#fbe9e7', color: '#8a3b2f' }}
          >
            {errorMessage}
          </div>
        )}

        {note && (
          <div className="flex flex-col gap-3">
            <div
              className="rounded-[10px] border bg-white px-4 py-3"
              style={{ borderColor: '#e8e4d9' }}
            >
              <span className="mb-2 block text-sm font-medium" style={{ color: '#2b2a26' }}>
                요약
              </span>
              <div
                className="text-sm"
                style={{ color: '#2b2a26', lineHeight: 1.7 }}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
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
                    table: ({ children }) => (
                      <div className="mb-2 overflow-x-auto">
                        <table className="w-full border-collapse text-sm">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th
                        className="border px-2 py-1 text-left font-medium"
                        style={{ borderColor: '#e8e4d9', backgroundColor: '#f7f3e9' }}
                      >
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="border px-2 py-1" style={{ borderColor: '#e8e4d9' }}>
                        {children}
                      </td>
                    ),
                  }}
                >
                  {note.summary}
                </ReactMarkdown>
              </div>
            </div>

            <div
              className="rounded-[10px] border bg-white px-4 py-3"
              style={{ borderColor: '#e8e4d9' }}
            >
              <span className="mb-2 block text-sm font-medium" style={{ color: '#2b2a26' }}>
                원본 텍스트
              </span>
              <p
                className="whitespace-pre-wrap text-sm"
                style={{ color: '#6b6a63', lineHeight: 1.7 }}
              >
                {note.raw_transcript}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
