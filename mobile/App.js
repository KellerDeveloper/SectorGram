import React, { useEffect, useState, useMemo } from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator, Platform, useColorScheme } from "react-native";
import { ThemeProvider } from "./src/theme/ThemeContext";
import * as Notifications from "expo-notifications";
import LoginScreen from "./src/screens/LoginScreen";
import ChatListScreen from "./src/screens/ChatListScreen";
import WebChatLayout from "./src/screens/WebChatLayout";
import ChatScreen from "./src/screens/ChatScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import EditProfileScreen from "./src/screens/EditProfileScreen";
import UserSearchScreen from "./src/screens/UserSearchScreen";
import ForwardMessageScreen from "./src/screens/ForwardMessageScreen";
import EventsScreen from "./src/screens/EventsScreen";
import { AuthContext } from "./src/context/AuthContext";
import { getStoredToken, removeToken, storeToken } from "./src/storage/tokenStorage";
import { setAuthToken, api } from "./src/api/client";

const Stack = createNativeStackNavigator();

// Тема навигации с акцентом приложения #E53935
const SectorLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#E53935",
    background: "#FFEBEE",
    card: "#FFFFFF",
    text: "#000000",
    border: "#E5E5E5",
  },
};
const SectorDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#E53935",
    background: "#121212",
    card: "#1E1E1E",
    text: "#FFFFFF",
    border: "#333333",
  },
};

// Глобальный обработчик уведомлений (когда приложение открыто)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const colorScheme = useColorScheme();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navTheme = colorScheme === "dark" ? SectorDarkTheme : SectorLightTheme;

  useEffect(() => {
    (async () => {
      const saved = await getStoredToken();
      if (saved?.token && saved?.user) {
        setToken(saved.token);
        setUser(saved.user);
        setAuthToken(saved.token);
      }
      setLoading(false);
    })();
  }, []);

  // Регистрация push-токена для текущего пользователя
  useEffect(() => {
    if (!token || !user) return;
    if (Platform.OS === "web") return;

    (async () => {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("Разрешение на push-уведомления не выдано");
          return;
        }

        // Канал для Android
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const expoPushToken = tokenData.data || tokenData;

        await api.post("/notifications/register", { expoPushToken });
      } catch (error) {
        console.log("Ошибка регистрации push-токена:", error);
      }
    })();
  }, [token, user]);

  const authContextValue = useMemo(
    () => ({
      token,
      user,
      signIn: async ({ token: newToken, user: newUser }) => {
        setToken(newToken);
        setUser(newUser);
        setAuthToken(newToken);
        await storeToken({ token: newToken, user: newUser });
      },
      signOut: async () => {
        setToken(null);
        setUser(null);
        setAuthToken(null);
        await removeToken();
      },
      updateUser: async (updatedUser) => {
        setUser(updatedUser);
        const saved = await getStoredToken();
        if (saved) {
          await storeToken({ token: saved.token, user: updatedUser });
        }
      },
    }),
    [token, user]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthContext.Provider value={authContextValue}>
        <NavigationContainer theme={navTheme}>
        <Stack.Navigator>
          {token == null ? (
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ title: "Вход / Регистрация" }}
            />
          ) : Platform.OS === "web" ? (
            <>
              {/* Web версия - две панели (список чатов + чат) */}
              <Stack.Screen
                name="ChatList"
                component={WebChatLayout}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Профиль" }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ title: "Редактировать профиль" }}
              />
              <Stack.Screen
                name="UserSearch"
                component={UserSearchScreen}
                options={{ title: "Поиск пользователей" }}
              />
              <Stack.Screen
                name="ForwardMessage"
                component={ForwardMessageScreen}
                options={{ title: "Переслать сообщение" }}
              />
              <Stack.Screen
                name="Events"
                component={EventsScreen}
                options={{ title: "Мероприятия" }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              {/* Mobile версия - полноэкранные экраны */}
              <Stack.Screen
                name="ChatList"
                component={ChatListScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="Chat"
                component={ChatScreen}
                options={({ route }) => ({ title: route.params?.title ?? "Чат" })}
              />
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: "Профиль" }}
              />
              <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{ title: "Редактировать профиль" }}
              />
              <Stack.Screen
                name="UserSearch"
                component={UserSearchScreen}
                options={{ title: "Поиск пользователей" }}
              />
              <Stack.Screen
                name="ForwardMessage"
                component={ForwardMessageScreen}
                options={{ title: "Переслать сообщение" }}
              />
              <Stack.Screen
                name="Events"
                component={EventsScreen}
                options={{ title: "Мероприятия" }}
              />
            </>
          )}
        </Stack.Navigator>
        </NavigationContainer>
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

