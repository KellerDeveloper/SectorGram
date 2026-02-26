import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "auth_token_v1";

export async function storeToken(data) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("Ошибка сохранения токена", e);
  }
}

export async function getStoredToken() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Ошибка чтения токена", e);
    return null;
  }
}

export async function removeToken() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn("Ошибка удаления токена", e);
  }
}

