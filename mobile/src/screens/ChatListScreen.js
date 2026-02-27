import React, { useContext, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import ChatList from "../components/ChatList";
import { useChatList } from "../hooks/useChatList";
import { useStories } from "../hooks/useStories";
import Avatar from "../components/Avatar";
import StoriesStrip from "../components/StoriesStrip";
import StoryViewer from "../components/StoryViewer";
import AddStoryModal from "../components/AddStoryModal";

export default function ChatListScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const { colors, isDark } = useTheme();
  const [storyViewerEntry, setStoryViewerEntry] = useState(null);
  const [addStoryVisible, setAddStoryVisible] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          backgroundColor: colors.primary,
          paddingTop: 50,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headerContent: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        headerTitle: { fontSize: 22, fontWeight: "600", color: "#FFFFFF" },
        headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
        searchButton: {
          width: 32,
          height: 32,
          justifyContent: "center",
          alignItems: "center",
        },
        searchButtonText: { fontSize: 20, color: "#FFFFFF" },
      }),
    [colors]
  );

  const {
    filteredChats,
    loading,
    searchQuery,
    setSearchQuery,
    refresh,
  } = useChatList(token);

  const {
    feed: storiesFeed,
    fetchFeed,
    createStory,
    markViewed,
  } = useStories(token);

  const openChat = (chat) => {
    navigation.navigate("Chat", {
      chatId: chat.id,
      title: chat.type === "private"
        ? chat.otherUser?.name || chat.title
        : chat.title,
      chatType: chat.type,
    });
  };

  const handleStoryUserPress = useCallback((entry) => {
    setStoryViewerEntry(entry);
  }, []);

  const handleStoryViewed = useCallback(
    (storyId) => {
      markViewed(storyId);
    },
    [markViewed]
  );

  const handleCreateStory = useCallback(
    async (payload) => {
      await createStory(payload);
    },
    [createStory]
  );

  const storiesHeader = (
    <StoriesStrip
      feed={storiesFeed}
      currentUserId={user?.id}
      currentUser={user}
      onUserPress={handleStoryUserPress}
      onAddStoryPress={() => setAddStoryVisible(true)}
      refresh={fetchFeed}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.card}
      />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>SectorGram</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate("UserSearch")}
              style={styles.searchButton}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate("Events")}
              style={styles.searchButton}
            >
              <Text style={styles.searchButtonText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
              <Avatar name={user?.name || "U"} size={32} avatar={user?.avatar} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ChatList
        chats={filteredChats}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refresh}
        onChatPress={openChat}
        currentUserId={user?.id}
        ListHeaderComponent={storiesHeader}
      />

      <StoryViewer
        visible={!!storyViewerEntry}
        entry={storyViewerEntry}
        onClose={() => {
          setStoryViewerEntry(null);
          fetchFeed();
        }}
        onViewed={handleStoryViewed}
      />

      <AddStoryModal
        visible={addStoryVisible}
        onClose={() => setAddStoryVisible(false)}
        onCreateStory={handleCreateStory}
      />
    </View>
  );
}
