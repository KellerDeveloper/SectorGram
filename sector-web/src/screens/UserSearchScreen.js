import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api/client";
import Avatar from "../components/Avatar";

export default function UserSearchScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);

  useEffect(() => {
    // Очищаем предыдущий таймер
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Если запрос меньше 2 символов, очищаем результаты
    if (searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    // Устанавливаем новый таймер для debounce
    const timer = setTimeout(() => {
      searchUsers(searchQuery.trim());
    }, 300); // Задержка 300мс

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery]);

  const searchUsers = async (query) => {
    if (!query || query.length < 2) return;

    setLoading(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setUsers(res.data.users || []);
    } catch (error) {
      console.error("Ошибка поиска:", error);
      Alert.alert("Ошибка", "Не удалось выполнить поиск");
    } finally {
      setLoading(false);
    }
  };

  const createPrivateChat = async (userId) => {
    try {
      const res = await api.post("/chats/private", { userId });
      const chat = res.data;

      // Переходим в чат
      navigation.navigate("Chat", {
        chatId: chat.id,
        title: chat.otherUser?.name || "Чат",
        chatType: "private",
      });
    } catch (error) {
      console.error("Ошибка создания чата:", error);
      Alert.alert("Ошибка", "Не удалось создать чат");
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => createPrivateChat(item.id)}
      activeOpacity={0.7}
    >
      <Avatar name={item.name} size={50} online={item.isOnline} avatar={item.avatar} />
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          {item.isOnline && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineText}>онлайн</Text>
            </View>
          )}
        </View>
        <Text style={styles.userEmail} numberOfLines={1}>
          {item.email}
        </Text>
        {item.username && (
          <Text style={styles.userUsername}>@{item.username}</Text>
        )}
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск пользователей..."
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          autoCapitalize="none"
        />
        {loading && (
          <ActivityIndicator
            style={styles.loader}
            size="small"
            color="#E53935"
          />
        )}
      </View>

      {searchQuery.trim().length < 2 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Введите минимум 2 символа для поиска
          </Text>
        </View>
      ) : users.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Пользователи не найдены</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F0F0F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: "#000000",
  },
  loader: {
    marginLeft: 8,
  },
  listContainer: {
    paddingVertical: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    marginRight: 8,
  },
  onlineBadge: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  onlineText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 14,
    color: "#707579",
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 12,
    color: "#999999",
  },
  arrow: {
    fontSize: 20,
    color: "#999999",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: "#999999",
    textAlign: "center",
  },
});
