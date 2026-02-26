import { useEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../api/socket";

export function useTypingIndicator({ chatId, token }) {
  const [text, setText] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const socket = getSocket() || connectSocket(token);

    const onUserTyping = ({ userId: typingUserId, userName }) => {
      setTypingUsers((prev) => {
        if (!prev.find((u) => u.userId === typingUserId)) {
          return [...prev, { userId: typingUserId, userName }];
        }
        return prev;
      });
    };

    const onUserStoppedTyping = ({ userId: stoppedUserId }) => {
      setTypingUsers((prev) => prev.filter((u) => u.userId !== stoppedUserId));
    };

    socket.on("user_typing", onUserTyping);
    socket.on("user_stopped_typing", onUserStoppedTyping);

    return () => {
      socket.off("user_typing", onUserTyping);
      socket.off("user_stopped_typing", onUserStoppedTyping);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit("typing_stop", { chatId });
    };
  }, [chatId, token]);

  const sendTypingStop = () => {
    const socket = getSocket() || connectSocket(token);
    socket.emit("typing_stop", { chatId });
  };

  const handleTextChange = (newText) => {
    setText(newText);
    const socket = getSocket() || connectSocket(token);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (newText.trim()) {
      socket.emit("typing_start", { chatId });
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingStop();
      }, 3000);
    } else {
      sendTypingStop();
    }
  };

  const clearText = () => {
    setText("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTypingStop();
  };

  return {
    text,
    handleTextChange,
    clearText,
    typingUsers,
  };
}

