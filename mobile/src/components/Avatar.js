import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";

export default function Avatar({ name, size = 40, online = false, avatar = null }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "?";

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
  ];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  const backgroundColor = colors[colorIndex];

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatar ? (
        <Image
          source={{ uri: avatar }}
          style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.initialsContainer, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
      {online && <View style={[styles.onlineIndicator, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  avatarImage: {
    resizeMode: "cover",
  },
  initialsContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4CAF50",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
});
