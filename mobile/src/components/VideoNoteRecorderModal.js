/**
 * Модальное окно записи видеосообщения («кружка») с фронтальной камеры.
 * При открытии автоматически запускает запись (после готовности камеры).
 * Лимит 60 сек, круглое превью, отправка через onSend(uri, durationSec).
 * Запись через expo-camera (Android/iOS); на web показывается заглушка.
 */
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import { useVideoPlayer, VideoView } from "expo-video";

/** Круглое превью видео (expo-video) для экрана после записи. */
function PreviewVideoCircle({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = false;
    p.loop = true;
  });
  return (
    <VideoView
      player={player}
      style={styles.previewVideo}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

const VIDEO_NOTE_SIZE = 280;
const MAX_DURATION_SEC = 60;
const CAMERA_READY_DELAY_MS = 800;

export default function VideoNoteRecorderModal({
  visible,
  onClose,
  onSend,
}) {
  const [recording, setRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const cameraRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  // Сброс состояния при открытии модалки
  useEffect(() => {
    if (visible) {
      setRecordedUri(null);
      setRecordedDuration(0);
      setRecording(false);
      setCameraReady(false);
      setError(null);
    }
  }, [visible]);

  const startRecording = async () => {
    if (!cameraRef.current || recording || recordedUri) return;
    setError(null);
    try {
      setRecording(true);
      recordingStartTimeRef.current = Date.now();
      const result = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION_SEC,
      });
      const durationSec = Math.round(
        (Date.now() - recordingStartTimeRef.current) / 1000
      );
      const uri = result?.uri ?? null;
      setRecordedUri(uri);
      setRecordedDuration(uri ? durationSec : 0);
      if (!uri) {
        setError("Не удалось сохранить запись");
      }
    } catch (e) {
      setError(e?.message || "Ошибка записи");
    } finally {
      setRecording(false);
    }
  };

  // Автостарт записи после готовности камеры (задержка из-за бага expo-camera на части устройств)
  useEffect(() => {
    if (!visible || !cameraReady || recording || recordedUri) return;
    const t = setTimeout(startRecording, CAMERA_READY_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, cameraReady, recording, recordedUri]);

  const handleStopRecording = () => {
    if (cameraRef.current && recording) {
      try {
        cameraRef.current.stopRecording();
      } catch (_) {}
    }
  };

  const handleSend = () => {
    if (recordedUri != null) {
      onSend?.(recordedUri, recordedDuration);
      onClose?.();
    }
  };

  const handleCancel = () => {
    if (recording) handleStopRecording();
    onClose?.();
  };

  // Запись доступна только на нативных платформах
  if (Platform.OS === "web") {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.webPlaceholder}>
          <Text style={styles.webPlaceholderText}>
            Запись видеокружков доступна в приложении на iOS и Android.
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E53935" />
        </View>
      </Modal>
    );
  }

  const permissionsGranted = permission?.granted && micPermission?.granted;
  if (!permission?.granted || !micPermission?.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.centered}>
          <Text style={styles.permissionText}>
            Для записи видеокружка нужны доступ к камере и микрофону.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={async () => {
              await requestPermission();
              await requestMicPermission();
            }}
          >
            <Text style={styles.primaryButtonText}>Разрешить</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Отмена</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  // Показать превью записанного видео в круге и кнопки Отправить / Отмена
  if (recordedUri) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.previewContainer}>
            <View style={styles.circleMask}>
              <PreviewVideoCircle uri={recordedUri} />
              <Text style={styles.durationHint}>{recordedDuration} сек</Text>
            </View>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
            <View style={styles.previewActions}>
              <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                <Text style={styles.sendButtonText}>Отправить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Экран записи: камера в режиме video с круглой маской
  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.fullscreen}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="video"
          onCameraReady={() => setCameraReady(true)}
        />
        {/* Круглая маска поверх камеры — визуально выделяем область «кружка» */}
        <View style={styles.maskOverlay} pointerEvents="none">
          <View style={[styles.circleOutline, { width: VIDEO_NOTE_SIZE, height: VIDEO_NOTE_SIZE, borderRadius: VIDEO_NOTE_SIZE / 2 }]} />
        </View>
        {/* Кнопка: Начать запись / Стоп (и таймер при записи) */}
        <View style={styles.recordingBar}>
          {recording && (
            <Text style={styles.recordingTimer}>
              Запись… (макс. {MAX_DURATION_SEC} сек)
            </Text>
          )}
          <TouchableOpacity
            style={styles.stopButton}
            onPress={recording ? handleStopRecording : startRecording}
            disabled={recording && false}
          >
            <Text style={styles.stopButtonText}>
              {recording ? "Стоп" : "Начать запись"}
            </Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeTopButton} onPress={handleCancel}>
          <Text style={styles.closeTopText}>✕</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  centered: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  maskOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  circleOutline: {
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
  },
  recordingBar: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  recordingTimer: {
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
  },
  stopButton: {
    backgroundColor: "#E53935",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeTopButton: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeTopText: {
    color: "#fff",
    fontSize: 20,
  },
  previewContainer: {
    alignItems: "center",
  },
  circleMask: {
    width: VIDEO_NOTE_SIZE,
    height: VIDEO_NOTE_SIZE,
    borderRadius: VIDEO_NOTE_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "#333",
    marginBottom: 24,
  },
  previewVideo: {
    width: VIDEO_NOTE_SIZE,
    height: VIDEO_NOTE_SIZE,
    position: "absolute",
    top: 0,
    left: 0,
  },
  durationHint: {
    position: "absolute",
    bottom: 8,
    alignSelf: "center",
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  errorText: {
    color: "#ff6b6b",
    marginBottom: 12,
  },
  previewActions: {
    flexDirection: "row",
    gap: 16,
  },
  sendButton: {
    backgroundColor: "#E53935",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: "#E53935",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  permissionText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  webPlaceholder: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  webPlaceholderText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
});
