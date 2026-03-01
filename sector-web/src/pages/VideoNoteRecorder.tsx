import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./VideoNoteRecorder.module.css";

export type VideoNoteRecorderResult = { blob: Blob; durationSec: number };

type Props = {
  open: boolean;
  onClose: () => void;
  onSend: (result: VideoNoteRecorderResult) => void;
};

export function VideoNoteRecorder({ open, onClose, onSend }: Props) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const [status, setStatus] = useState<"idle" | "ready" | "recording" | "recorded">("idle");
  const [error, setError] = useState("");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordedUrlRef = useRef<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setError("");
      setRecordedBlob(null);
      setRecordedDuration(0);
      setRecordSeconds(0);
      stopStream();
      return;
    }

    setError("");
    setStatus("idle");
    let cancelled = false;

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 640 },
      },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
        }
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.name === "NotAllowedError" ? "Доступ к камере запрещён" : "Не удалось подключить камеру");
          setStatus("idle");
        }
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, stopStream]);

  useEffect(() => {
    if (status !== "recording") return;
    const t = setInterval(() => {
      setRecordSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 200);
    return () => clearInterval(t);
  }, [status]);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;
    setError("");
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const durationSec = (Date.now() - startTimeRef.current) / 1000;
      setRecordedBlob(blob);
      setRecordedDuration(durationSec);
      setStatus("recorded");
    };
    recorder.start(200);
    recorderRef.current = recorder;
    startTimeRef.current = Date.now();
    setRecordSeconds(0);
    setStatus("recording");
  }, []);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
  }, []);

  const handleSend = useCallback(() => {
    if (!recordedBlob) return;
    if (recordedUrlRef.current) {
      URL.revokeObjectURL(recordedUrlRef.current);
      recordedUrlRef.current = null;
    }
    onSend({ blob: recordedBlob, durationSec: recordedDuration });
    onClose();
  }, [recordedBlob, recordedDuration, onSend, onClose]);

  const handleCancel = useCallback(() => {
    if (status === "recorded") {
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = null;
      }
      setRecordedBlob(null);
      setRecordedDuration(0);
      setStatus("ready");
    } else {
      onClose();
    }
  }, [status, onClose]);

  const recordedVideoUrl = recordedBlob ? (recordedUrlRef.current ?? (recordedUrlRef.current = URL.createObjectURL(recordedBlob))) : null;
  useEffect(() => {
    return () => {
      if (recordedUrlRef.current) {
        URL.revokeObjectURL(recordedUrlRef.current);
        recordedUrlRef.current = null;
      }
    };
  }, []);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleCancel()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.previewWrap}>
          {status === "recorded" && recordedVideoUrl ? (
            <video
              src={recordedVideoUrl}
              className={styles.recordedPreview}
              playsInline
              muted
              loop
              autoPlay
            />
          ) : (
            <video
              ref={previewRef}
              className={styles.previewVideo}
              autoPlay
              playsInline
              muted
            />
          )}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {status === "ready" && (
          <>
            <p className={styles.hint}>Нажмите кнопку для начала записи</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.recordBtn}
                onClick={startRecording}
                aria-label="Начать запись"
              >
                ●
              </button>
            </div>
          </>
        )}

        {status === "recording" && (
          <div className={styles.actions}>
            <span className={styles.timer}>{recordSeconds} сек</span>
            <button
              type="button"
              className={`${styles.recordBtn} ${styles.recordBtnRecording}`}
              onClick={stopRecording}
              aria-label="Остановить запись"
            >
              ■
            </button>
          </div>
        )}

        {status === "recorded" && (
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
              Отмена
            </button>
            <button type="button" className={styles.sendBtn} onClick={handleSend}>
              Отправить
            </button>
          </div>
        )}

        {status === "idle" && !error && <p className={styles.hint}>Подключение камеры…</p>}
      </div>
    </div>
  );
}
