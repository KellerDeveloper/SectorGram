import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal } from "react-native";

const POPULAR_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉", "💯"];

export default function ReactionPicker({ visible, onSelect, onClose, position }) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.container,
            position && {
              top: Math.max(10, position.y - 60),
              left: Math.max(10, Math.min(position.x - 100, 200)),
            },
          ]}
        >
          <View style={styles.picker}>
            {POPULAR_EMOJIS.map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.emojiButton}
                onPress={() => {
                  onSelect(emoji);
                  onClose();
                }}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  picker: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  emojiButton: {
    padding: 8,
  },
  emoji: {
    fontSize: 24,
  },
});
