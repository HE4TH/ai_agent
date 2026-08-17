'use client';

import { useRef, useState } from 'react';

type MeetingNote = {
  id: string;
  raw_transcript: string;
  summary: string;
};

export default function MeetingNotesPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [note, setNote] = useState<MeetingNote | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const submitRecording = async (blob: Blob) => {
    setProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

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
        await submitRecording(blob);
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
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: '#d97757' }}
          />
          <h1 className="text-lg font-medium" style={{ color: '#2b2a26' }}>
            회의록 자동 요약
          </h1>
        </div>
        <p className="mb-6 text-sm" style={{ color: '#6b6a63' }}>
          녹음을 종료하면 음성을 텍스트로 변환하고 핵심 내용을 요약합니다
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
              <p
                className="whitespace-pre-wrap text-sm"
                style={{ color: '#2b2a26', lineHeight: 1.7 }}
              >
                {note.summary}
              </p>
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
