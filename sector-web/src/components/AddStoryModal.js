import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function AddStoryModal({ visible, onClose, onCreateStory }) {
  const [mode, setMode] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateText = async () => {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    try {
      await onCreateStory({ type: "text", text: t });
      setText("");
      setMode(null);
      onClose();
    } catch (e) {
      Alert.alert("Ошибка", e.message || "Не удалось опубликовать");
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) {
        setMode(null);
        return;
      }
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
      if (base64.length > 2 * 1024 * 1024) {
        Alert.alert("Ошибка", "Изображение слишком большое (макс. 2MB)");
        setMode(null);
        return;
      }
      setLoading(true);
      await onCreateStory({
        type: "photo",
        media: { url: base64, thumbnail: base64 },
      });
      setMode(null);
      onClose();
    } catch (e) {
      Alert.alert("Ошибка", e.message || "Не удалось добавить фото");
    } finally {
      setLoading(false);
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.7,
      });
      if (result.canceled || !result.assets[0]) {
        setMode(null);
        return;
      }
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
      setLoading(true);
      await onCreateStory({
        type: "photo",
        media: { url: base64, thumbnail: base64 },
      });
      setMode(null);
      onClose();
    } catch (e) {
      Alert.alert("Ошибка", e.message || "Не удалось сделать фото");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        setMode(null);
        onClose();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.header}>
            <Text style={styles.title}>Новая история</Text>
            <TouchableOpacity
              onPress={() => {
                setMode(null);
                setText("");
                onClose();
              }}
            >
              <Text style={styles.cancel}>Отмена</Text>
            </TouchableOpacity>
          </View>

          {mode === null && (
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setMode("text")}
              >
                <Text style={styles.optionEmoji}>📝</Text>
                <Text style={styles.optionText}>Текст</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.option}
                onPress={handlePickImage}
                disabled={loading}
              >
                <Text style={styles.optionEmoji}>🖼</Text>
                <Text style={styles.optionText}>Галерея</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.option}
                onPress={openCamera}
                disabled={loading}
              >
                <Text style={styles.optionEmoji}>📷</Text>
                <Text style={styles.optionText}>Камера</Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "text" && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.textSection}
            >
              <TextInput
                style={styles.input}
                placeholder="Что у вас нового?"
                placeholderTextColor="#999"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.publishBtn, (!text.trim() || loading) && styles.publishBtnDisabled]}
                onPress={handleCreateText}
                disabled={!text.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.publishBtnText}>Опубликовать</Text>
                )}
              </TouchableOpacity>
            </KeyboardAvoidingView>
          )}

          {loading && mode !== "text" && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  box: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
    minHeight: 260,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  cancel: {
    fontSize: 16,
    color: "#E53935",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  option: {
    alignItems: "center",
    padding: 16,
  },
  optionEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: "#333",
  },
  textSection: {
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  publishBtn: {
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
});
