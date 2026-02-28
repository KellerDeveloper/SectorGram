import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Avatar from "./Avatar";
import { useTheme } from "../theme/ThemeContext";

const CIRCLE_SIZE = 64;
const RING_WIDTH = 2.5;
const SPACING = 12;
const WRAP_SIZE = CIRCLE_SIZE + RING_WIDTH * 2;

/**
 * Кружки историй как в Telegram.
 * feed: массив { userId, user: { id, name, avatar }, stories } из useStories.
 * currentUserId — чтобы выделить "Моя история" и проверять viewed.
 */
export default function StoriesStrip({
  feed,
  currentUserId,
  currentUser,
  onUserPress,
  onAddStoryPress,
  refresh,
}) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          paddingVertical: 12,
          backgroundColor: colors.card,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        scrollContent: {
          paddingHorizontal: 16,
          gap: SPACING,
          alignItems: "center",
        },
        circleWrap: {
          alignItems: "center",
          marginRight: SPACING,
          width: WRAP_SIZE,
        },
        circleInner: {
          width: WRAP_SIZE,
          height: WRAP_SIZE,
          justifyContent: "center",
          alignItems: "center",
        },
        ring: {
          ...StyleSheet.absoluteFillObject,
          borderWidth: RING_WIDTH,
          borderRadius: WRAP_SIZE / 2,
        },
        ringNew: { borderColor: colors.primary },
        ringViewed: { borderColor: colors.border },
        ringAdd: { borderColor: colors.border },
        avatarWrap: {
          width: CIRCLE_SIZE,
          height: CIRCLE_SIZE,
          borderRadius: CIRCLE_SIZE / 2,
          overflow: "hidden",
          position: "relative",
        },
        plusBadge: {
          position: "absolute",
          bottom: -2,
          right: -2,
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.primary,
          justifyContent: "center",
          alignItems: "center",
        },
        plusText: {
          color: "#FFFFFF",
          fontSize: 16,
          fontWeight: "700",
          marginTop: -2,
        },
        label: {
          marginTop: 6,
          fontSize: 12,
          color: colors.textSecondary,
          maxWidth: WRAP_SIZE,
        },
      }),
    [colors]
  );

  useEffect(() => {
    if (refresh) refresh();
  }, []);

  const hasViewed = (entry) => {
    if (entry.userId === currentUserId) return true;
    return entry.stories.every((s) =>
      (s.viewedBy || []).some((v) => v.userId === currentUserId)
    );
  };

  const myEntry = feed.find((e) => e.userId === currentUserId);
  const hasMyStories = myEntry && myEntry.stories.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Моя история — первый кружок */}
        <TouchableOpacity
          style={styles.circleWrap}
          onPress={() => {
            if (hasMyStories) {
              onUserPress(myEntry);
            } else {
              onAddStoryPress();
            }
          }}
        >
          <View style={styles.circleInner}>
            <View
              style={[
                styles.ring,
                styles.ringAdd,
                { width: WRAP_SIZE, height: WRAP_SIZE, borderRadius: WRAP_SIZE / 2 },
              ]}
            />
            <View style={styles.avatarWrap}>
              <Avatar
                name={currentUser?.name || "Я"}
                size={CIRCLE_SIZE}
                avatar={currentUser?.avatar}
              />
              {!hasMyStories && (
                <View style={styles.plusBadge}>
                  <Text style={styles.plusText}>+</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.label} numberOfLines={1}>
            Моя история
          </Text>
        </TouchableOpacity>

        {feed
          .filter((e) => e.userId !== currentUserId)
          .map((entry) => {
            const viewed = hasViewed(entry);
            return (
              <TouchableOpacity
                key={entry.userId}
                style={styles.circleWrap}
                onPress={() => onUserPress(entry)}
                activeOpacity={0.8}
              >
                <View style={styles.circleInner}>
                  <View
                    style={[
                      styles.ring,
                      viewed ? styles.ringViewed : styles.ringNew,
                      { width: WRAP_SIZE, height: WRAP_SIZE, borderRadius: WRAP_SIZE / 2 },
                    ]}
                  />
                  <View style={styles.avatarWrap}>
                    <Avatar
                      name={entry.user?.name || "?"}
                      size={CIRCLE_SIZE}
                      avatar={entry.user?.avatar}
                    />
                  </View>
                </View>
                <Text style={styles.label} numberOfLines={1}>
                  {entry.user?.name || "Пользователь"}
                </Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>
    </View>
  );
}
