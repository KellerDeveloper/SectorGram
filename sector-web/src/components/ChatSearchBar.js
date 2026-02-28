import React from "react";
import { View, TextInput, TouchableOpacity, Text, Platform } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function ChatSearchBar({
  visible,
  query,
  onChangeQuery,
  onClear,
  autoFocus = Platform.OS !== "web",
  styles,
}) {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View style={styles.searchBar}>
      <TextInput
        style={styles.searchInput}
        placeholder="Поиск по сообщениям..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={onChangeQuery}
        autoFocus={autoFocus}
      />
      {query ? (
        <TouchableOpacity onPress={onClear} style={styles.searchClearButton}>
          <Text style={styles.searchClearButtonText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

