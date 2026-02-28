import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api/client";
import Avatar from "../components/Avatar";

export default function EditProfileScreen({ navigation }) {
  const { user, token, updateUser } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get("/users/me");
      const profile = res.data;
      setName(profile.name || "");
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatar(profile.avatar || null);
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
      Alert.alert("Ошибка", "Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      // Запрашиваем разрешение
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Нужно разрешение на доступ к фотографиям");
        return;
      }

      // Открываем галерею
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images", // Используем строку вместо enum
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Уменьшаем качество для меньшего размера
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = result.assets[0].base64;
        
        if (base64) {
          // Проверяем размер base64 (примерно 1.33x от размера файла)
          const sizeInMB = (base64.length * 3) / 4 / 1024 / 1024;
          
          if (sizeInMB > 2) {
            Alert.alert(
              "Изображение слишком большое",
              "Пожалуйста, выберите изображение меньшего размера или уменьшите качество."
            );
            return;
          }
          
          // Сохраняем base64 как data URI
          const dataUri = `data:image/jpeg;base64,${base64}`;
          setAvatar(dataUri);
        }
      }
    } catch (error) {
      console.error("Ошибка выбора фото:", error);
      Alert.alert("Ошибка", "Не удалось выбрать фото");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Нужно разрешение на доступ к камере");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images", // Используем строку вместо enum
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Уменьшаем качество для меньшего размера
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const base64 = result.assets[0].base64;
        
        if (base64) {
          // Проверяем размер base64
          const sizeInMB = (base64.length * 3) / 4 / 1024 / 1024;
          
          if (sizeInMB > 2) {
            Alert.alert(
              "Изображение слишком большое",
              "Пожалуйста, сделайте фото меньшего размера."
            );
            return;
          }
          
          const dataUri = `data:image/jpeg;base64,${base64}`;
          setAvatar(dataUri);
        }
      }
    } catch (error) {
      console.error("Ошибка съемки фото:", error);
      Alert.alert("Ошибка", "Не удалось сделать фото");
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      "Выберите фото",
      "Откуда вы хотите выбрать фото?",
      [
        { text: "Галерея", onPress: pickImage },
        { text: "Камера", onPress: takePhoto },
        { text: "Отмена", style: "cancel" },
      ]
    );
  };

  const removeAvatar = () => {
    setAvatar(null);
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Ошибка", "Имя обязательно");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/users/me", {
        name: name.trim(),
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatar: avatar || null,
      });

      // Обновляем пользователя в контексте
      if (updateUser) {
        updateUser(res.data);
      }

      Alert.alert("Успех", "Профиль обновлен", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("Ошибка сохранения:", error);
      let errorMessage = "Не удалось обновить профиль";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert("Ошибка", errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53935" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={showImagePicker}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarImage} />
          ) : (
            <Avatar name={name || "U"} size={100} />
          )}
          <View style={styles.avatarOverlay}>
            <Text style={styles.avatarOverlayText}>📷</Text>
          </View>
        </TouchableOpacity>
        {avatar && (
          <TouchableOpacity
            onPress={removeAvatar}
            style={styles.removeAvatarButton}
          >
            <Text style={styles.removeAvatarText}>Удалить фото</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Имя *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ваше имя"
            placeholderTextColor="#999999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor="#999999"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>
            Будет использоваться для поиска (@username)
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>О себе</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Расскажите о себе..."
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            maxLength={200}
          />
          <Text style={styles.hint}>{bio.length}/200</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Сохранить</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    right: "35%",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  avatarOverlayText: {
    fontSize: 16,
  },
  removeAvatarButton: {
    marginTop: 12,
  },
  removeAvatarText: {
    color: "#FF3B30",
    fontSize: 14,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#000000",
  },
  bioInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    color: "#999999",
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#E53935",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
