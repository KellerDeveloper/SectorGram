import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";

export default function NotificationBanner({ title, message, onPress, onClose }) {
  if (!title && !message) {
    return null;
  }

  const content = (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        {title ? (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {message ? (
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.wrapper}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  container: {
    backgroundColor: "#333333",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  textContainer: {
    flexDirection: "column",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: "#F5F5F5",
  },
});

