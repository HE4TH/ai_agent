'use client';

import { useRef, useState } from 'react';

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: unknown) => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function SttTestPage() {
  const [isRecording, setIsRecording] = useState(false);

  const [webSpeechTranscript, setWebSpeechTranscript] = useState('');
  const [webSpeechLatencyMs, setWebSpeechLatencyMs] = useState<number | null>(null);

  const [whisperTranscript, setWhisperTranscript] = useState<string | null>(null);
  const [whisperLatencyMs, setWhisperLatencyMs] = useState<number | null>(null);
  const [whisperDurationSeconds, setWhisperDurationSeconds] = useState<number | null>(null);
  const [whisperCostUsd, setWhisperCostUsd] = useState<number | null>(null);
  const [whisperLoading, setWhisperLoading] = useState(false);

  const [referenceText, setReferenceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const sendToWhisper = async (blob: Blob) => {
    setWhisperLoading(true);

    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/stt-test/whisper', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Whisper 처리 중 오류가 발생했습니다');
      }

      // 녹음 시작 시각부터 Whisper 응답을 받은 시각까지로 통일해서 측정한다.
      setWhisperTranscript(data.transcript);
      setWhisperLatencyMs(Date.now() - recordingStartTimeRef.current);
      setWhisperDurationSeconds(data.duration_seconds ?? null);
      setWhisperCostUsd(data.cost_usd ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Whisper 처리 중 오류가 발생했습니다');
    } finally {
      setWhisperLoading(false);
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    setSaved(false);
    setWebSpeechTranscript('');
    setWebSpeechLatencyMs(null);
    setWhisperTranscript(null);
    setWhisperLatencyMs(null);
    setWhisperDurationSeconds(null);
    setWhisperCostUsd(null);
    setReferenceText('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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

        await sendToWhisper(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      recordingStartTimeRef.current = Date.now();
      mediaRecorder.start();

      const RecognitionCtor = window.webkitSpeechRecognition ?? window.SpeechRecognition;

      if (RecognitionCtor) {
        const recognition = new RecognitionCtor();
        recognition.lang = 'ko-KR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let finalChunk = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalChunk += result[0].transcript;
            }
          }

          if (finalChunk) {
            setWebSpeechTranscript((prev) => prev + finalChunk);
            setWebSpeechLatencyMs(Date.now() - recordingStartTimeRef.current);
          }
        };

        recognition.onerror = () => {};

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setErrorMessage('이 브라우저는 Web Speech API를 지원하지 않습니다. Whisper 결과만 확인할 수 있습니다.');
      }

      setIsRecording(true);
    } catch {
      setErrorMessage('마이크에 접근할 수 없습니다. 권한을 확인해주세요.');
    }
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;

    setIsRecording(false);
  };

  const saveComparison = async () => {
    if (whisperTranscript === null) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/stt-test/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webSpeechResult: {
            transcript: webSpeechTranscript,
            latency_ms: webSpeechLatencyMs,
          },
          whisperResult: {
            transcript: whisperTranscript,
            latency_ms: whisperLatencyMs,
            duration_seconds: whisperDurationSeconds,
            cost_usd: whisperCostUsd,
          },
          referenceText,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? '저장 중 오류가 발생했습니다');
      }

      setSaved(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다');
    } finally {
      setSaving(false);
    }
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
            STT 비교 테스트
          </h1>
        </div>
        <p className="mb-6 text-sm" style={{ color: '#6b6a63' }}>
          Web Speech API와 Whisper의 인식 결과를 나란히 비교합니다
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
              {isRecording ? '녹음 중...' : whisperLoading ? 'Whisper 처리 중...' : '대기 중'}
            </span>
          </div>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={whisperLoading}
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

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-[10px] border bg-white px-4 py-3" style={{ borderColor: '#e8e4d9' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#2b2a26' }}>
                Web Speech
              </span>
              {webSpeechLatencyMs !== null && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: '#f0ece0', color: '#6b6a63' }}
                >
                  {webSpeechLatencyMs}ms
                </span>
              )}
            </div>
            <p
              className="min-h-[80px] whitespace-pre-wrap text-sm"
              style={{ color: webSpeechTranscript ? '#2b2a26' : '#a6a296' }}
            >
              {webSpeechTranscript || '녹음을 시작하면 실시간으로 표시됩니다'}
            </p>
          </div>

          <div className="rounded-[10px] border bg-white px-4 py-3" style={{ borderColor: '#e8e4d9' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#2b2a26' }}>
                Whisper
              </span>
              {whisperLatencyMs !== null && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: '#f0ece0', color: '#6b6a63' }}
                >
                  {whisperLatencyMs}ms
                </span>
              )}
            </div>
            <p
              className="min-h-[80px] whitespace-pre-wrap text-sm"
              style={{ color: whisperTranscript ? '#2b2a26' : '#a6a296' }}
            >
              {whisperLoading
                ? '처리 중...'
                : whisperTranscript || '녹음을 종료하면 결과가 표시됩니다'}
            </p>
          </div>
        </div>

        <div className="rounded-[10px] border bg-white px-4 py-3" style={{ borderColor: '#e8e4d9' }}>
          <label className="mb-2 block text-sm font-medium" style={{ color: '#2b2a26' }}>
            정답 텍스트 직접 입력
          </label>
          <textarea
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            placeholder="실제로 말한 내용을 입력해주세요"
            rows={3}
            className="mb-3 w-full resize-none rounded-[8px] border bg-transparent px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#e8e4d9', color: '#2b2a26' }}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={saveComparison}
              disabled={saving || isRecording || whisperTranscript === null}
              className="rounded-[10px] px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#d97757' }}
            >
              {saving ? '저장 중...' : '비교 저장'}
            </button>
            {saved && (
              <span className="text-sm" style={{ color: '#2f6b34' }}>
                저장되었습니다
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
