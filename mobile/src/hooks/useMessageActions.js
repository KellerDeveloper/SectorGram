import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { connectSocket, getSocket } from "../api/socket";

const MAX_PHOTO_BASE64 = 2 * 1024 * 1024;
const MAX_VIDEO_BASE64 = 10 * 1024 * 1024;
const MAX_AUDIO_BASE64 = 5 * 1024 * 1024;

async function uriToDataUrl(uri) {
  const blob = await fetch(uri).then((r) => r.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useMessageActions({
  chatId,
  token,
  messages,
  clearText,
  navigation,
}) {
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const handleSend = (rawText) => {
    const text = rawText.trim();
    if (!text && !editingMessage) return;

    const socket = getSocket() || connectSocket(token);

    if (editingMessage) {
      socket.emit("edit_message", {
        messageId: editingMessage.id,
        text,
      });
      setEditingMessage(null);
    } else {
      socket.emit("send_message", {
        chatId,
        text,
        replyTo: replyingTo?.id,
      });
      setReplyingTo(null);
    }

    clearText();
  };

  const handleDeleteMessage = (messageId) => {
    Alert.alert(
      "Удалить сообщение?",
      "Это действие нельзя отменить",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: () => {
            const socket = getSocket() || connectSocket(token);
            socket.emit("delete_message", { messageId });
          },
        },
      ]
    );
  };

  const handleLongPress = (message) => {
    const actions = [];

    if (message.isMine) {
      actions.push({
        text: "Редактировать",
        onPress: () => {
          setEditingMessage(message);
          setReplyingTo(null);
          // Текст будет установлен через контролируемый инпут (handleTextChange + clearText)
        },
      });
      actions.push({
        text: "Удалить",
        style: "destructive",
        onPress: () => handleDeleteMessage(message.id),
      });
    }

    // Переслать доступно для всех сообщений
    actions.push({
      text: "Переслать",
      onPress: () => {
        navigation.navigate("ForwardMessage", { messageId: message.id });
      },
    });

    // Ответить доступно для чужих сообщений
    if (!message.isMine) {
      actions.push({
        text: "Ответить",
        onPress: () => {
          setReplyingTo(message);
        },
      });
    }

    actions.push({ text: "Отмена", style: "cancel" });

    Alert.alert("Сообщение", "Выберите действие", actions);
  };

  const handleReactionPress = (messageId, emoji) => {
    const socket = getSocket() || connectSocket(token);
    const message = messages.find((m) => m.id === messageId);

    if (!message) return;

    // Проверяем, есть ли уже такая реакция (по эмодзи)
    const reaction = message.reactions?.find((r) => r.emoji === emoji);
    const hasReaction = reaction && reaction.count > 0;

    if (hasReaction) {
      socket.emit("remove_reaction", { messageId, emoji });
    } else {
      socket.emit("add_reaction", { messageId, emoji });
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await fetch(asset.uri)
          .then((res) => res.blob())
          .then((blob) => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          });

        // Проверяем размер (макс 2MB для base64)
        if (base64.length > MAX_PHOTO_BASE64) {
          Alert.alert("Ошибка", "Изображение слишком большое (макс. 2MB)");
          return;
        }

        const socket = getSocket() || connectSocket(token);
        socket.emit("send_message", {
          chatId,
          text: "",
          media: {
            type: "photo",
            url: base64,
            thumbnail: base64,
          },
        });
      }
    } catch (error) {
      console.error("Ошибка выбора фото:", error);
      Alert.alert("Ошибка", "Не удалось выбрать фото");
    }
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Нужен доступ", "Разрешите доступ к галерее для выбора видео");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await uriToDataUrl(asset.uri);
        if (base64.length > MAX_VIDEO_BASE64) {
          Alert.alert("Ошибка", "Видео слишком большое (макс. 10MB). Выберите более короткий ролик.");
          return;
        }
        const socket = getSocket() || connectSocket(token);
        socket.emit("send_message", {
          chatId,
          text: "",
          replyTo: replyingTo?.id,
          media: {
            type: "video",
            url: base64,
            thumbnail: undefined,
          },
        });
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Ошибка выбора видео:", error);
      Alert.alert("Ошибка", "Не удалось выбрать видео");
    }
  };

  const handleRecordVideo = async () => {
    try {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (camStatus !== "granted") {
        Alert.alert("Нужен доступ", "Разрешите доступ к камере для записи видео");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "videos",
        allowsEditing: true,
        quality: 0.7,
        videoMaxDuration: 60,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const base64 = await uriToDataUrl(asset.uri);
        if (base64.length > MAX_VIDEO_BASE64) {
          Alert.alert("Ошибка", "Видео слишком большое (макс. 10MB). Запишите более короткий ролик.");
          return;
        }
        const socket = getSocket() || connectSocket(token);
        socket.emit("send_message", {
          chatId,
          text: "",
          replyTo: replyingTo?.id,
          media: {
            type: "video",
            url: base64,
            thumbnail: undefined,
          },
        });
        setReplyingTo(null);
      }
    } catch (error) {
      console.error("Ошибка записи видео:", error);
      const msg =
        error?.message?.includes("simulator") ||
        error?.message?.includes("Camera not available")
          ? "Камера недоступна. В симуляторе запись с камеры не поддерживается. Используйте реальное устройство или выберите видео из галереи."
          : "Не удалось записать видео";
      Alert.alert("Ошибка", msg);
    }
  };

  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  const handleStartRecordingAudio = async () => {
    if (isRecordingAudio) return;
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert("Нужен доступ", "Разрешите доступ к микрофону для голосовых сообщений");
        return;
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecordingAudio(true);
    } catch (error) {
      console.error("Ошибка старта записи:", error);
      Alert.alert("Ошибка", "Не удалось начать запись");
    }
  };

  const handleStopAndSendAudio = async () => {
    if (!isRecordingAudio) return;
    try {
      await audioRecorder.stop();
      setIsRecordingAudio(false);
      const status = audioRecorder.getStatus?.();
      const uri = audioRecorder.uri ?? status?.uri ?? status?.url;
      if (!uri) {
        Alert.alert("Ошибка", "Не удалось сохранить запись");
        return;
      }
      const base64 = await uriToDataUrl(uri);
      if (base64.length > MAX_AUDIO_BASE64) {
        Alert.alert("Ошибка", "Голосовое сообщение слишком длинное (макс. 5MB)");
        return;
      }
      const socket = getSocket() || connectSocket(token);
      socket.emit("send_message", {
        chatId,
        text: "",
        replyTo: replyingTo?.id,
        media: {
          type: "audio",
          url: base64,
        },
      });
      setReplyingTo(null);
    } catch (error) {
      console.error("Ошибка отправки голосового:", error);
      setIsRecordingAudio(false);
      Alert.alert("Ошибка", "Не удалось отправить голосовое сообщение");
    }
  };

  const handleCancelRecordingAudio = async () => {
    if (isRecordingAudio) {
      try {
        await audioRecorder.stop();
      } catch (_) {}
    }
    setIsRecordingAudio(false);
  };

  const handleSendSticker = (emoji) => {
    const socket = getSocket() || connectSocket(token);
    socket.emit("send_message", {
      chatId,
      text: "",
      replyTo: replyingTo?.id,
      media: {
        type: "sticker",
        emoji,
      },
    });
    setReplyingTo(null);
  };

  /** Отправка видеосообщения-кружка: uri — локальный файл после записи, durationSec — длительность в секундах. */
  const handleSendVideoNote = async (uri, durationSec) => {
    try {
      const base64 = await uriToDataUrl(uri);
      if (base64.length > MAX_VIDEO_BASE64) {
        Alert.alert("Ошибка", "Видео слишком большое (макс. 10MB). Запишите короче.");
        return;
      }
      const socket = getSocket() || connectSocket(token);
      socket.emit("send_message", {
        chatId,
        text: "",
        replyTo: replyingTo?.id,
        media: {
          type: "videoNote",
          url: base64,
          duration: durationSec,
          thumbnail: undefined,
        },
      });
      setReplyingTo(null);
    } catch (error) {
      console.error("Ошибка отправки видеокружка:", error);
      Alert.alert("Ошибка", "Не удалось отправить видеосообщение");
    }
  };

  const handleCancel = () => {
    setReplyingTo(null);
    setEditingMessage(null);
    clearText();
  };

  return {
    replyingTo,
    editingMessage,
    handleSend,
    handleLongPress,
    handleReactionPress,
    handlePickImage,
    handlePickVideo,
    handleRecordVideo,
    handleStartRecordingAudio,
    handleStopAndSendAudio,
    handleCancelRecordingAudio,
    isRecordingAudio,
    handleSendSticker,
    handleSendVideoNote,
    handleCancel,
    setEditingMessage,
    setReplyingTo,
  };
}

