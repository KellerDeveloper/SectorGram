import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  Alert,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function MessageInput({
  text,
  onChangeText,
  onSend,
  onPickImage,
  onPickVideo,
  onRecordVideo,
  onRecordVideoNoteLongPress,
  isEditing,
  styles,
}) {
  const { colors } = useTheme();
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const canSend = !!text.trim() || isEditing;

  const handleVideoPress = () => {
    if (!onPickVideo && !onRecordVideo) return;
    if (Platform.OS === "ios" && typeof ActionSheetIOS !== "undefined" && ActionSheetIOS.showActionSheetWithOptions) {
      const options = [
        onPickVideo && "Выбрать из галереи",
        onRecordVideo && "Записать с камеры",
        "Отмена",
      ].filter(Boolean);
      const cancelIndex = options.length - 1;
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancelIndex },
        (i) => {
          if (i === 0 && onPickVideo) onPickVideo();
          if (i === 1 && onRecordVideo) onRecordVideo();
        }
      );
    } else if (Platform.OS === "android") {
      Alert.alert(
        "Видео",
        null,
        [
          onPickVideo && { text: "Выбрать из галереи", onPress: onPickVideo },
          onRecordVideo && { text: "Записать с камеры", onPress: onRecordVideo },
          { text: "Отмена", style: "cancel" },
        ].filter(Boolean)
      );
    } else {
      setShowVideoMenu(true);
    }
  };

  const closeVideoMenu = () => setShowVideoMenu(false);

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TouchableOpacity onPress={onPickImage} style={styles.attachButton}>
          <Text style={styles.attachButtonText}>📎</Text>
        </TouchableOpacity>
        {/* Видеокружок: долгое нажатие — запись с фронтальной камеры */}
        {onRecordVideoNoteLongPress && (
          <TouchableOpacity
            onLongPress={onRecordVideoNoteLongPress}
            delayLongPress={300}
            style={styles.attachButton}
          >
            <Text style={styles.attachButtonText}>📷</Text>
          </TouchableOpacity>
        )}
        {(onPickVideo || onRecordVideo) && (
          <TouchableOpacity onPress={handleVideoPress} style={styles.attachButton}>
            <Text style={styles.attachButtonText}>🎥</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder={isEditing ? "Редактировать сообщение..." : "Сообщение"}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4096}
        />
        <TouchableOpacity
          onPress={onSend}
          style={[
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
          ]}
          disabled={!canSend}
        >
          <Text style={styles.sendButtonText}>{isEditing ? "✓" : "➤"}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showVideoMenu}
        transparent
        animationType="fade"
        onRequestClose={closeVideoMenu}
      >
        <TouchableOpacity
          style={styles.stickerOverlay}
          activeOpacity={1}
          onPress={closeVideoMenu}
        >
          <View style={styles.videoMenuPanel} onStartShouldSetResponder={() => true}>
            <Text style={styles.stickerPanelTitle}>Видео</Text>
            {onPickVideo && (
              <TouchableOpacity
                style={styles.videoMenuButton}
                onPress={() => {
                  onPickVideo();
                  closeVideoMenu();
                }}
              >
                <Text style={styles.videoMenuButtonText}>Выбрать из галереи</Text>
              </TouchableOpacity>
            )}
            {onRecordVideo && (
              <TouchableOpacity
                style={styles.videoMenuButton}
                onPress={() => {
                  onRecordVideo();
                  closeVideoMenu();
                }}
              >
                <Text style={styles.videoMenuButtonText}>Записать с камеры</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.videoMenuCancelButton} onPress={closeVideoMenu}>
              <Text style={styles.videoMenuCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

