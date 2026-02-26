import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api/client";
import { connectSocket, getSocket } from "../api/socket";
import ChatListItem from "../components/ChatListItem";

export default function ForwardMessageScreen({ route, navigation }) {
  const { messageId } = route.params;
  const { token, user } = useContext(AuthContext);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const res = await api.get("/chats");
      setChats(res.data);
    } catch (error) {
      console.error("Ошибка загрузки чатов:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter((chat) => {
    const name = chat.type === "private" 
      ? chat.otherUser?.name || chat.title || ""
      : chat.title || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleForward = async (targetChatId) => {
    try {
      const socket = getSocket() || connectSocket(token);
      socket.emit("forward_message", {
        messageId,
        targetChatId,
      });
      
      navigation.goBack();
    } catch (error) {
      console.error("Ошибка пересылки:", error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск чата..."
          placeholderTextColor="#999999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredChats}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleForward(item.id)}
            style={styles.chatItem}
          >
            <ChatListItem
              chat={item}
              onPress={() => handleForward(item.id)}
              currentUserId={user?.id}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Нет чатов</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    padding: 12,
    backgroundColor: "#F0F0F0",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  chatItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  emptyText: {
    fontSize: 16,
    color: "#999999",
  },
});
