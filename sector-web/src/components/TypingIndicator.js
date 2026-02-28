import React from "react";
import { View, Text } from "react-native";

export default function TypingIndicator({ typingUsers, styles }) {
  if (!typingUsers || typingUsers.length === 0) return null;

  return (
    <View style={styles.typingIndicator}>
      <Text style={styles.typingText}>
        {typingUsers.map((u) => u.userName).join(", ")} печатает...
      </Text>
    </View>
  );
}

