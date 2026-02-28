import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "./Avatar";
import { useTheme } from "../theme/ThemeContext";

export default function ChatListItem({ chat, onPress, currentUserId }) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: colors.card,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        content: { flex: 1, marginLeft: 12, justifyContent: "center" },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        },
        name: {
          fontSize: 16,
          fontWeight: "500",
          color: colors.text,
          flex: 1,
        },
        time: { fontSize: 12, color: colors.textMuted, marginLeft: 8 },
        footer: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        lastMessage: { fontSize: 14, color: colors.textSecondary, flex: 1 },
        unreadMessage: { fontWeight: "500", color: colors.text },
        unreadBadge: {
          backgroundColor: colors.primary,
          borderRadius: 10,
          minWidth: 20,
          height: 20,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 6,
          marginLeft: 8,
        },
        unreadText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
      }),
    [colors]
  );

  // Для личных чатов показываем имя собеседника
  const displayName =
    chat.type === "private"
      ? chat.otherUser?.name ||
        chat.otherUser?.email ||
        chat.title ||
        "Чат"
      : chat.title || "Групповой чат";

  const lastMessageObj = chat.lastMessage;
  let lastMessage = "";
  if (lastMessageObj) {
    if (chat.type === "group" && lastMessageObj.author) {
      lastMessage = `${lastMessageObj.author.name}: ${lastMessageObj.text}`;
    } else {
      lastMessage = lastMessageObj.text || "";
    }
  }
  
  const lastMessageTime = chat.lastMessageAt 
    ? formatTime(chat.lastMessageAt)
    : "";

  const unreadCount = typeof chat.unreadCount === "number" 
    ? chat.unreadCount 
    : chat.unreadCount?.[currentUserId] || 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Avatar 
        name={displayName} 
        size={50} 
        online={chat.otherUser?.isOnline}
        avatar={chat.type === "private" ? chat.otherUser?.avatar : null}
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {lastMessageTime && (
            <Text style={styles.time}>{lastMessageTime}</Text>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadMessage]} numberOfLines={1}>
            {lastMessage || "Нет сообщений"}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  } else if (days === 1) {
    return "Вчера";
  } else if (days < 7) {
    return date.toLocaleDateString("ru-RU", { weekday: "short" });
  } else {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }
}
