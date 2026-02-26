import React, { useRef } from "react";
import { FlatList, Pressable } from "react-native";
import MessageBubble from "./MessageBubble";

export default function MessageList({
  messages,
  userId,
  chatType,
  searchQuery,
  onLongPress,
  onReactionPress,
  styles,
}) {
  const listRef = useRef(null);

  const scrollToBottom = () => {
    if (!listRef.current) return;
    listRef.current.scrollToEnd({ animated: true });
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.text?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const renderItem = ({ item, index }) => {
    const isMine = item.authorId === userId;
    const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
    const showAvatar =
      !isMine &&
      (!prevMessage ||
        prevMessage.authorId !== item.authorId ||
        new Date(item.createdAt) - new Date(prevMessage.createdAt) > 300000); // 5 минут

    const showName =
      !isMine &&
      chatType === "group" &&
      (!prevMessage || prevMessage.authorId !== item.authorId);

    return (
      <Pressable
        onLongPress={() => onLongPress && onLongPress({ ...item, isMine })}
      >
        <MessageBubble
          message={item}
          isMine={isMine}
          showAvatar={showAvatar}
          showName={showName}
          searchQuery={searchQuery}
          onReactionPress={onReactionPress}
          currentUserId={userId}
        />
      </Pressable>
    );
  };

  return (
    <FlatList
      ref={listRef}
      data={filteredMessages}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.messagesContainer}
      onContentSizeChange={scrollToBottom}
      inverted={false}
    />
  );
}

