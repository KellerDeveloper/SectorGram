import React, { useContext, useState, useMemo } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { api, setAuthToken } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

export default function LoginScreen() {
  const { signIn } = useContext(AuthContext);
  const { colors } = useTheme();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          justifyContent: "center",
          padding: 16,
          backgroundColor: colors.background,
        },
        title: {
          fontSize: 24,
          fontWeight: "600",
          marginBottom: 16,
          textAlign: "center",
          color: colors.text,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
          color: colors.text,
          backgroundColor: colors.card,
        },
      }),
    [colors]
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.post("/auth/login", { email, password });
        const { token, user } = res.data;
        setAuthToken(token);
        await signIn({ token, user });
      } else {
        const res = await api.post("/auth/register", { email, password, name });
        const { token, user } = res.data;
        setAuthToken(token);
        await signIn({ token, user });
      }
    } catch (e) {
      console.log(e);
      Alert.alert("Ошибка", e.response?.data?.error || "Не удалось выполнить запрос");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {mode === "login" ? "Вход" : "Регистрация"}
      </Text>
      {mode === "register" && (
        <TextInput
          style={styles.input}
          placeholder="Имя"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        placeholderTextColor={colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
        onPress={handleSubmit}
        disabled={loading}
      />
      <View style={{ height: 12 }} />
      <Button
        title={
          mode === "login"
            ? "Нет аккаунта? Зарегистрироваться"
            : "Уже есть аккаунт? Войти"
        }
        onPress={() => setMode(mode === "login" ? "register" : "login")}
      />
    </View>
  );
}

