import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import NotificationBanner from "../components/NotificationBanner";
import ChatSearchBar from "../components/ChatSearchBar";
import TypingIndicator from "../components/TypingIndicator";
import ReplyBar from "../components/ReplyBar";
import MessageInput from "../components/MessageInput";
import MessageList from "../components/MessageList";
import VideoNoteRecorderModal from "../components/VideoNoteRecorderModal";
import { useChatMessages } from "../hooks/useChatMessages";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import { useMessageActions } from "../hooks/useMessageActions";

export default function ChatScreen({ route, navigation }) {
  const { chatId, title, chatType } = route.params;
  const { token, user } = useContext(AuthContext);
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showVideoNoteRecorder, setShowVideoNoteRecorder] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.backgroundSecondary },
        webHeader: {
          backgroundColor: colors.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        webHeaderContent: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        webHeaderTitle: {
          fontSize: 16,
          fontWeight: "600",
          color: "#FFFFFF",
        },
        searchHeaderButton: { padding: 4 },
        searchHeaderButtonText: { fontSize: 18, color: "#FFFFFF" },
        searchBar: {
          flexDirection: "row",
          backgroundColor: colors.inputBg,
          paddingHorizontal: 12,
          paddingVertical: 8,
          alignItems: "center",
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        searchInput: {
          flex: 1,
          backgroundColor: colors.card,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 15,
          color: colors.text,
        },
        searchClearButton: { marginLeft: 8, padding: 4 },
        searchClearButtonText: { fontSize: 18, color: colors.textMuted },
        messagesContainer: { paddingVertical: 12 },
        inputContainer: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: 8,
        },
        inputWrapper: {
          flexDirection: "row",
          alignItems: "flex-end",
          backgroundColor: colors.inputBg,
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 6,
        },
        input: {
          flex: 1,
          fontSize: 15,
          color: colors.text,
          maxHeight: 100,
          paddingVertical: 4,
        },
        sendButton: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
          marginLeft: 8,
        },
        sendButtonDisabled: { backgroundColor: colors.textMuted },
        sendButtonText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "600",
        },
        replyBar: {
          flexDirection: "row",
          backgroundColor: colors.inputBg,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        replyContent: { flex: 1, flexDirection: "row" },
        replyLine: {
          width: 3,
          backgroundColor: colors.primary,
          marginRight: 8,
        },
        replyInfo: { flex: 1 },
        replyAuthor: { fontSize: 12, fontWeight: "600", color: colors.primary },
        replyText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        replyClose: { padding: 4 },
        replyCloseText: { fontSize: 18, color: colors.textMuted },
        typingIndicator: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: colors.inputBg,
        },
        typingText: {
          fontSize: 13,
          fontStyle: "italic",
          color: colors.textSecondary,
        },
        attachButton: { padding: 8, marginRight: 4 },
        attachButtonText: { fontSize: 20, color: colors.text },
        stickerOverlay: {
          flex: 1,
          backgroundColor: colors.overlay,
          justifyContent: "flex-end",
        },
        stickerPanel: {
          backgroundColor: colors.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: 320,
          paddingBottom: 24,
        },
        stickerPanelTitle: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 8,
        },
        stickerGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          paddingHorizontal: 12,
          justifyContent: "flex-start",
        },
        stickerItem: {
          width: "12.5%",
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        stickerEmoji: { fontSize: 28 },
        videoMenuPanel: {
          backgroundColor: colors.card,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        },
        videoMenuButton: {
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        videoMenuButtonText: { fontSize: 16, color: colors.text },
        videoMenuCancelButton: {
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginTop: 8,
        },
        videoMenuCancelText: { fontSize: 16, color: colors.primary },
        recordingBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        recordingBarText: { fontSize: 15, color: colors.textSecondary },
        recordingBarActions: { flexDirection: "row", alignItems: "center" },
        recordingCancelButton: {
          paddingVertical: 6,
          paddingHorizontal: 12,
          marginRight: 8,
        },
        recordingCancelText: { fontSize: 15, color: colors.primary },
        recordingSendButton: {
          paddingVertical: 6,
          paddingHorizontal: 12,
          backgroundColor: colors.primary,
          borderRadius: 16,
        },
        recordingSendText: {
          fontSize: 15,
          color: "#FFFFFF",
          fontWeight: "600",
        },
      }),
    [colors]
  );

  const {
    messages,
    otherChatNotification,
    setOtherChatNotification,
  } = useChatMessages({ chatId, token, userId: user?.id });
  const {
    text,
    handleTextChange,
    clearText,
    typingUsers,
  } = useTypingIndicator({ chatId, token });
  const {
    replyingTo,
    editingMessage,
    handleSend,
    handleLongPress,
    handleReactionPress,
    handlePickImage,
    handlePickVideo,
    handleRecordVideo,
    handleSendVideoNote,
    handleCancel,
    setEditingMessage,
    setReplyingTo,
  } = useMessageActions({
    chatId,
    token,
    messages,
    clearText,
    navigation,
  });

  useEffect(() => {
    // Устанавливаем header только если это не веб-версия (там header не нужен)
    if (Platform.OS !== "web") {
      navigation.setOptions({
        title: title || "Чат",
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setShowSearch((prev) => !prev)}
            style={{ marginRight: 16 }}
          >
            <Text style={{ fontSize: 20, color: colors.text }}>🔍</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, title, colors]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.primary}
      />

      {otherChatNotification && (
        <NotificationBanner
          title={otherChatNotification.title}
          message={otherChatNotification.text}
          onPress={null}
          onClose={() => setOtherChatNotification(null)}
        />
      )}
      
      {/* Header для веб-версии */}
      {Platform.OS === "web" && (
        <View style={styles.webHeader}>
          <View style={styles.webHeaderContent}>
            <Text style={styles.webHeaderTitle}>{title || "Чат"}</Text>
            <TouchableOpacity
              onPress={() => setShowSearch((prev) => !prev)}
              style={styles.searchHeaderButton}
            >
              <Text style={styles.searchHeaderButtonText}>🔍</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Поиск по сообщениям */}
      <ChatSearchBar
        visible={showSearch || (Platform.OS === "web" && !!searchQuery)}
        query={searchQuery}
        onChangeQuery={setSearchQuery}
        onClear={() => setSearchQuery("")}
        styles={styles}
      />

      <MessageList
        messages={messages}
        userId={user?.id}
        chatType={chatType}
        searchQuery={searchQuery}
        onLongPress={handleLongPress}
        onReactionPress={handleReactionPress}
        styles={styles}
      />

      <TypingIndicator typingUsers={typingUsers} styles={styles} />

      <ReplyBar
        replyingTo={replyingTo}
        editingMessage={editingMessage}
        onCancel={handleCancel}
        styles={styles}
      />

      <MessageInput
        text={text}
        onChangeText={handleTextChange}
        onSend={() => handleSend(text)}
        onPickImage={handlePickImage}
        onPickVideo={handlePickVideo}
        onRecordVideo={handleRecordVideo}
        onRecordVideoNoteLongPress={() => setShowVideoNoteRecorder(true)}
        isEditing={!!editingMessage}
        styles={styles}
      />
      <VideoNoteRecorderModal
        visible={showVideoNoteRecorder}
        onClose={() => setShowVideoNoteRecorder(false)}
        onSend={handleSendVideoNote}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF5F5",
  },
  webHeader: {
    backgroundColor: "#E53935",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  webHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  webHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  searchHeaderButton: {
    padding: 4,
  },
  searchHeaderButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  searchBar: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  searchClearButton: {
    marginLeft: 8,
    padding: 4,
  },
  searchClearButtonText: {
    fontSize: 18,
    color: "#999999",
  },
  messagesContainer: {
    paddingVertical: 12,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#F0F0F0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#000000",
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  replyBar: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
  },
  replyContent: {
    flex: 1,
    flexDirection: "row",
  },
  replyLine: {
    width: 3,
    backgroundColor: "#E53935",
    marginRight: 8,
  },
  replyInfo: {
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: "600",
    color: "#E53935",
  },
  replyText: {
    fontSize: 12,
    color: "#707579",
    marginTop: 2,
  },
  replyClose: {
    padding: 4,
  },
  replyCloseText: {
    fontSize: 18,
    color: "#999999",
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F0F0F0",
  },
  typingText: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#707579",
  },
  attachButton: {
    padding: 8,
    marginRight: 4,
  },
  attachButtonText: {
    fontSize: 20,
  },
  stickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  stickerPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 320,
    paddingBottom: 24,
  },
  stickerPanelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    justifyContent: "flex-start",
  },
  stickerItem: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stickerEmoji: {
    fontSize: 28,
  },
  videoMenuPanel: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  videoMenuButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5E5",
  },
  videoMenuButtonText: {
    fontSize: 16,
    color: "#000000",
  },
  videoMenuCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  videoMenuCancelText: {
    fontSize: 16,
    color: "#E53935",
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recordingBarText: {
    fontSize: 15,
    color: "#707579",
  },
  recordingBarActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  recordingCancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  recordingCancelText: {
    fontSize: 15,
    color: "#E53935",
  },
  recordingSendButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#E53935",
    borderRadius: 16,
  },
  recordingSendText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
