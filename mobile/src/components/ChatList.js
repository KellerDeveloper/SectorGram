import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  RefreshControl,
} from "react-native";
import ChatListItem from "./ChatListItem";
import { useTheme } from "../theme/ThemeContext";

/**
 * Презентационный компонент для отображения списка чатов.
 * Не знает о навигации и сокетах — только UI.
 */
export default function ChatList({
  chats,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onChatPress,
  currentUserId,
  containerStyle,
  searchContainerStyle,
  ListHeaderComponent,
}) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.card },
        searchContainer: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: colors.card,
        },
        searchInput: {
          backgroundColor: colors.inputBg,
          borderRadius: 20,
          paddingHorizontal: 16,
          paddingVertical: 8,
          fontSize: 15,
          color: colors.text,
        },
        emptyContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 100,
        },
        emptyText: { fontSize: 16, color: colors.textMuted },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Поиск */}
      <View style={[styles.searchContainer, searchContainerStyle]}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Список чатов */}
      <FlatList
        data={chats}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ChatListItem
            chat={item}
            onPress={() => onChatPress(item)}
            currentUserId={currentUserId}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "Ничего не найдено" : "Нет чатов"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

