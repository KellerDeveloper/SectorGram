import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Pressable,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Полноэкранный просмотр историй одного пользователя.
 * entry: { user, stories }
 * onClose, onViewed(storyId)
 */
export default function StoryViewer({ visible, entry, onClose, onViewed }) {
  const [index, setIndex] = useState(0);
  const viewedRef = useRef(new Set());

  const stories = entry?.stories || [];
  const story = stories[index];

  useEffect(() => {
    if (!visible) setIndex(0);
  }, [visible]);

  useEffect(() => {
    if (story && onViewed && !viewedRef.current.has(story.id)) {
      viewedRef.current.add(story.id);
      onViewed(story.id);
    }
  }, [story?.id, onViewed]);

  if (!visible || !entry) return null;

  const goNext = () => {
    if (index < stories.length - 1) {
      setIndex(index + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const handlePress = (ev) => {
    const x = ev.nativeEvent?.locationX ?? ev.nativeEvent?.pageX;
    if (x < SCREEN_WIDTH / 3) goPrev();
    else if (x > (SCREEN_WIDTH * 2) / 3) goNext();
    else goNext();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <Pressable style={styles.container} onPress={handlePress}>
        {/* Прогресс-бары */}
        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: i <= index ? "100%" : "0%" },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Шапка */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarSmall, !entry.user?.avatar && styles.avatarPlaceholder]}>
              {entry.user?.avatar ? (
                <Image source={{ uri: entry.user.avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitial}>
                  {(entry.user?.name || "?").charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <Text style={styles.userName}>{entry.user?.name || "Пользователь"}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Контент истории */}
        <View style={styles.content}>
          {story?.type === "photo" && story.media?.url ? (
            <Image
              source={{ uri: story.media.url }}
              style={styles.storyImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.textCard}>
              <Text style={styles.storyText}>{story?.text || ""}</Text>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 56,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholder: {
    backgroundColor: "#E53935",
  },
  avatarImg: {
    width: 36,
    height: 36,
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  userName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 22,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  storyImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT - 120,
  },
  textCard: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH - 48,
  },
  storyText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 28,
    textAlign: "center",
  },
});
