import { useEffect, useState } from "react";
import { api } from "../api/client";
import { connectSocket, getSocket } from "../api/socket";

export function useChatSocket({ chatId, token, userId }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [otherChatNotification, setOtherChatNotification] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadMessages = async () => {
      try {
        const res = await api.get(`/chats/${chatId}/messages`);
        if (!isMounted) return;
        setMessages(res.data);
      } catch (e) {
        console.log(e);
      }
    };

    loadMessages();

    const socket = getSocket() || connectSocket(token);
    socket.emit("join_chat", chatId);

    // Отмечаем сообщения как прочитанные при открытии чата
    socket.emit("mark_read", { chatId });

    const onNewMessage = (msg) => {
      if (!isMounted) return;

      if (msg.chatId === chatId) {
        setMessages((prev) => {
          // Проверяем, нет ли уже такого сообщения
          if (prev.find((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });
        // Отмечаем как прочитанное если это не наше сообщение
        if (msg.authorId !== userId) {
          socket.emit("mark_read", { chatId, messageIds: [msg.id] });
        }
      } else {
        // Уведомление о новом сообщении в другом чате
        setOtherChatNotification({
          chatId: msg.chatId,
          title: msg.author?.name || "Новое сообщение",
          text: msg.text || "Новое сообщение в другом чате",
        });
      }
    };

    const onMessageUpdated = (msg) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, text: msg.text, editedAt: msg.editedAt } : m
        )
      );
    };

    const onMessageDeleted = ({ id }) => {
      if (!isMounted) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    };

    const onUserTyping = ({ userId: typingUserId, userName }) => {
      if (!isMounted) return;
      setTypingUsers((prev) => {
        if (!prev.find((u) => u.userId === typingUserId)) {
          return [...prev, { userId: typingUserId, userName }];
        }
        return prev;
      });
    };

    const onUserStoppedTyping = ({ userId: stoppedUserId }) => {
      if (!isMounted) return;
      setTypingUsers((prev) => prev.filter((u) => u.userId !== stoppedUserId));
    };

    const onMessagesRead = ({ userId: readerId, messageIds }) => {
      if (!isMounted || !messageIds) return;
      // Обновляем статусы сообщений на "read" только для наших сообщений
      if (readerId && readerId === userId) return;
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m.id) && m.authorId === userId
            ? { ...m, status: "read" }
            : m
        )
      );
    };

    const onReactionChanged = ({ messageId, reactions }) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    socket.on("new_message", onNewMessage);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stopped_typing", onUserStoppedTyping);
    socket.on("messages_read", onMessagesRead);
    socket.on("reaction_added", onReactionChanged);
    socket.on("reaction_removed", onReactionChanged);

    return () => {
      isMounted = false;
      socket.emit("leave_chat", chatId);
      socket.emit("typing_stop", { chatId });
      socket.off("new_message", onNewMessage);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stopped_typing", onUserStoppedTyping);
      socket.off("messages_read", onMessagesRead);
      socket.off("reaction_added", onReactionChanged);
      socket.off("reaction_removed", onReactionChanged);
    };
  }, [chatId, token, userId]);

  // Авто-скрытие уведомлений о других чатах
  useEffect(() => {
    if (!otherChatNotification) return;
    const timer = setTimeout(() => {
      setOtherChatNotification(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [otherChatNotification]);

  return {
    messages,
    typingUsers,
    otherChatNotification,
    setOtherChatNotification,
  };
}

