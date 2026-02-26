import React, { useContext, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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
import ChatScreen from "./ChatScreen";

export default function WebChatLayout({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const { colors } = useTheme();
  const [selectedChatId, setSelectedChatId] = useState(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          flexDirection: "row",
          backgroundColor: colors.background,
        },
        sidebar: {
          width: 400,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          backgroundColor: colors.card,
          flexDirection: "column",
        },
        sidebarHeader: {
          backgroundColor: colors.primary,
          paddingTop: 20,
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
        headerTitle: {
          fontSize: 22,
          fontWeight: "600",
          color: "#FFFFFF",
        },
        headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
        searchButton: {
          width: 32,
          height: 32,
          justifyContent: "center",
          alignItems: "center",
        },
        searchButtonText: { fontSize: 20, color: "#FFFFFF" },
        searchContainer: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: colors.background,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        chatArea: {
          flex: 1,
          backgroundColor: colors.backgroundSecondary,
          display: "flex",
          flexDirection: "column",
        },
        emptyState: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.backgroundSecondary,
        },
        emptyContent: { alignItems: "center" },
        emptyEmoji: { fontSize: 64, marginBottom: 16 },
        emptyStateText: { fontSize: 16, color: colors.textSecondary },
      }),
    [colors]
  );
  const [selectedChatTitle, setSelectedChatTitle] = useState(null);
  const [selectedChatType, setSelectedChatType] = useState(null);
  const [storyViewerEntry, setStoryViewerEntry] = useState(null);
  const [addStoryVisible, setAddStoryVisible] = useState(false);

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

  const handleChatSelect = (chat) => {
    setSelectedChatId(chat.id);
    setSelectedChatTitle(
      chat.type === "private"
        ? chat.otherUser?.name || chat.title
        : chat.title
    );
    setSelectedChatType(chat.type);
  };

  const handleStoryUserPress = useCallback((entry) => {
    setStoryViewerEntry(entry);
  }, []);

  const handleStoryViewed = useCallback(
    (storyId) => markViewed(storyId),
    [markViewed]
  );

  const handleCreateStory = useCallback(
    async (payload) => await createStory(payload),
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
      {/* Sidebar - список чатов */}
      <View style={styles.sidebar}>
        {/* Header */}
        <View style={styles.sidebarHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>SectorGram</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate("UserSearch")}
                style={styles.searchButton}
              >
                <Text style={styles.searchButtonText}>🔍</Text>
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
          onChatPress={handleChatSelect}
          currentUserId={user?.id}
          searchContainerStyle={styles.searchContainer}
          ListHeaderComponent={storiesHeader}
        />
      </View>

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

      {/* Chat Area - окно чата */}
      <View style={styles.chatArea}>
        {selectedChatId ? (
          <ChatScreen
            route={{
              params: {
                chatId: selectedChatId,
                title: selectedChatTitle,
                chatType: selectedChatType,
              },
            }}
            navigation={navigation}
          />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyContent}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyStateText}>Выберите чат для начала общения</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
