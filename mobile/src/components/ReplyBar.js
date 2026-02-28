import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

export default function ReplyBar({
  replyingTo,
  editingMessage,
  onCancel,
  styles,
}) {
  if (!replyingTo && !editingMessage) return null;

  return (
    <View style={styles.replyBar}>
      <View style={styles.replyContent}>
        <View style={styles.replyLine} />
        <View style={styles.replyInfo}>
          <Text style={styles.replyAuthor}>
            {editingMessage
              ? "Редактирование"
              : replyingTo?.author?.name || "Вы"}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {editingMessage ? editingMessage.text : replyingTo?.text}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onCancel} style={styles.replyClose}>
        <Text style={styles.replyCloseText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

