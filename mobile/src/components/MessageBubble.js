import React, { useState, memo, useEffect, useRef, createContext, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEvent, useEventListener } from "expo";
import * as FileSystem from "expo-file-system/legacy";
import Avatar from "./Avatar";
import ReactionPicker from "./ReactionPicker";
import { useTheme } from "../theme/ThemeContext";

/** Преобразует data URL (base64) в file:// URI для нативного плеера; для http/file возвращает как есть. */
function useResolvedVideoUri(uri) {
  const isDataUrl = !!(uri && typeof uri === "string" && uri.startsWith("data:"));
  const [playableUri, setPlayableUri] = useState(() => (uri && !isDataUrl ? uri : null));
  const [loading, setLoading] = useState(isDataUrl);

  useEffect(() => {
    if (!uri || typeof uri !== "string") {
      setPlayableUri(null);
      setLoading(false);
      return;
    }
    if (!uri.startsWith("data:")) {
      setPlayableUri(uri);
      setLoading(false);
      return;
    }
    const comma = uri.indexOf(",");
    if (comma === -1) {
      setLoading(false);
      return;
    }
    const base64 = uri.slice(comma + 1);
    let cancelled = false;
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) {
      setLoading(false);
      return;
    }
    const fileUri = `${cacheDir}videonote_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`;
    FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 })
      .then(() => {
        if (!cancelled) {
          setPlayableUri(fileUri);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    };
  }, [uri]);

  return { playableUri, loading };
}

const VIDEO_NOTE_BUBBLE_SIZE = 200;
const VIDEO_NOTE_SEGMENTS = 120;
const videoNoteProgressSegments = Array.from({ length: VIDEO_NOTE_SEGMENTS });
const MessageBubbleStylesContext = createContext(null);

// Компонент для подсветки текста поиска
const HighlightedText = memo(function HighlightedText({ text, query, style }) {
  const styles = useContext(MessageBubbleStylesContext);
  if (!query || !text) {
    return <Text style={style}>{text}</Text>;
  }
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  return (
    <Text style={style}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={index} style={styles?.highlightedPart}>
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
});

const ForwardedLabel = memo(function ForwardedLabel({ forwardedFromUser }) {
  const styles = useContext(MessageBubbleStylesContext);
  if (!forwardedFromUser || !styles) return null;
  return (
    <View style={styles.forwardedContainer}>
      <Text style={styles.forwardedLabel}>
        Переслано от {forwardedFromUser.name || "пользователя"}
      </Text>
    </View>
  );
});

const ReplyPreview = memo(function ReplyPreview({ replyTo }) {
  const styles = useContext(MessageBubbleStylesContext);
  if (!replyTo || !styles) return null;
  let replyLabel = replyTo.text || "";
  if (replyTo.media?.type === "sticker") replyLabel = replyTo.media.emoji || "Стикер";
  else if (replyTo.media?.type === "audio") replyLabel = "Голосовое сообщение";
  else if (replyTo.media?.type === "video") replyLabel = "Видео";
  else if (replyTo.media?.type === "videoNote") replyLabel = "Видеосообщение";
  else if (replyTo.media?.type === "photo") replyLabel = "Фото";
  if (!replyLabel) replyLabel = "Сообщение";
  return (
    <View style={styles.replyContainer}>
      <View style={styles.replyLine} />
      <View>
        <Text style={styles.replyAuthor}>{replyTo.author?.name}</Text>
        <Text style={styles.replyText} numberOfLines={1}>
          {replyLabel}
        </Text>
      </View>
    </View>
  );
});

const StickerBubble = memo(function StickerBubble({ media }) {
  const styles = useContext(MessageBubbleStylesContext);
  if (!media || media.type !== "sticker" || !styles) return null;
  if (media.emoji) {
    return <Text style={styles.stickerEmojiBubble}>{media.emoji}</Text>;
  }
  if (media.url) {
    return (
      <Image
        source={{ uri: media.url }}
        style={styles.stickerImage}
        resizeMode="contain"
      />
    );
  }
  return null;
});

const MediaMessageBubble = memo(function MediaMessageBubble({ media }) {
  const styles = useContext(MessageBubbleStylesContext);
  if (!media || !styles) return null;
  if (media.type === "sticker") return <StickerBubble media={media} />;
  if (media.type === "photo" && media.url) {
    return (
      <Image
        source={{ uri: media.url }}
        style={styles.mediaImage}
        resizeMode="cover"
      />
    );
  }
  if (media.type === "video") return <VideoMessageBubble media={media} />;
  if (media.type === "videoNote") return <VideoNoteBubble media={media} />;
  if (media.type === "audio") return <AudioMessageBubble media={media} />;
  return null;
});

const FileMessageBubble = memo(function FileMessageBubble({ media }) {
  const styles = useContext(MessageBubbleStylesContext);
  if (!media || media.type !== "file" || !styles) return null;
  return (
    <View style={styles.fileContainer}>
      <Text style={styles.fileIcon}>📎</Text>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {media.filename || "Файл"}
        </Text>
        {media.size && (
          <Text style={styles.fileSize}>{formatFileSize(media.size)}</Text>
        )}
      </View>
    </View>
  );
});

const AudioMessageBubble = memo(function AudioMessageBubble({ media }) {
  const styles = useContext(MessageBubbleStylesContext);
  const player = useAudioPlayer(media?.url ?? null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const togglePlay = () => {
    if (!media?.url) return;
    if (status.playing) player.pause();
    else player.play();
  };
  if (!media || media.type !== "audio" || !styles) return null;
  return (
    <TouchableOpacity
      style={styles.audioContainer}
      onPress={togglePlay}
      activeOpacity={0.8}
    >
      <Text style={styles.audioIcon}>{status.playing ? "⏸" : "▶"}</Text>
      <Text style={styles.audioLabel}>Голосовое сообщение</Text>
    </TouchableOpacity>
  );
});

/** Контент модалки с плеером (expo-video): создаём player только при открытой модалке. */
const VideoModalContent = memo(function VideoModalContent({ source, onClose }) {
  const styles = useContext(MessageBubbleStylesContext);
  const player = useVideoPlayer(source, (p) => {
    p.muted = false;
  });
  useEvent(player, "playToEnd", onClose);
  return (
    <VideoView
      player={player}
      style={styles?.videoPlayer}
      nativeControls
      contentFit="contain"
    />
  );
});

/** Обычное видео: прямоугольный плеер и превью, модальное окно при тапе. */
const VideoMessageBubble = memo(function VideoMessageBubble({ media }) {
  const styles = useContext(MessageBubbleStylesContext);
  const [videoVisible, setVideoVisible] = useState(false);

  if (!media || media.type !== "video" || !styles) return null;
  return (
    <>
      <TouchableOpacity
        style={styles.videoRectContainer}
        onPress={() => setVideoVisible(true)}
        activeOpacity={0.9}
      >
        {media.thumbnail ? (
          <Image
            source={{ uri: media.thumbnail }}
            style={styles.videoRectThumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.videoRectThumbnail, styles.videoThumbnailPlaceholder]}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        )}
        <View style={styles.playButtonRect}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </TouchableOpacity>
      <Modal
        visible={videoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVideoVisible(false)}
      >
        <TouchableOpacity
          style={styles.videoModalOverlay}
          activeOpacity={1}
          onPress={() => setVideoVisible(false)}
        >
          <View
            style={styles.videoModalContent}
            onStartShouldSetResponder={() => true}
          >
            {media.url && videoVisible && (
              <VideoModalContent
                source={media.url}
                onClose={() => setVideoVisible(false)}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
});

/** Внутренний плеер кружка: только при наличии playableUri (file:// или http). */
const VideoNoteBubblePlayer = memo(function VideoNoteBubblePlayer({ videoUri, media, styles }) {
  const [progress, setProgress] = useState(0);
  const player = useVideoPlayer(videoUri, (p) => {
    p.loop = true;
    p.muted = false;
    p.timeUpdateEventInterval = 0.15;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  useEventListener(player, "timeUpdate", (e) => {
    const dur = player.duration;
    setProgress(dur > 0 ? e.currentTime / dur : 0);
  });
  useEventListener(player, "playToEnd", () => setProgress(0));

  const togglePlay = () => {
    if (player.playing) player.pause();
    else player.play();
  };

  const durationSec = media?.duration ?? 0;

  return (
    <TouchableOpacity
      style={styles.videoNoteContainer}
      onPress={togglePlay}
      activeOpacity={0.9}
    >
      <View style={styles.videoNoteCircle}>
        {media?.thumbnail && !isPlaying ? (
          <Image
            source={{ uri: media.thumbnail }}
            style={styles.videoNoteImage}
            resizeMode="cover"
          />
        ) : null}
        <VideoView
          player={player}
          style={styles.videoNoteVideo}
          contentFit="cover"
          nativeControls={false}
        />
        {!isPlaying && (
          <View style={styles.videoNotePlayButton} pointerEvents="none">
            <Text style={styles.playIcon}>▶</Text>
          </View>
        )}
      </View>
      <View style={styles.videoNoteProgressRing} pointerEvents="none">
        <View style={styles.videoNoteProgressTrack} />
        {/* 120 сегментов по краю кружка: заполнение от 12 часов по часовой стрелке */}
        {videoNoteProgressSegments.map((_, i) =>
          i < Math.floor(progress * VIDEO_NOTE_SEGMENTS) ? (
            <View
              key={i}
              style={[
                styles.videoNoteProgressSegmentWrapper,
                { transform: [{ rotate: `${(i * 360) / VIDEO_NOTE_SEGMENTS}deg` }] },
              ]}
            >
              <View style={styles.videoNoteProgressSegment} />
            </View>
          ) : null
        )}
      </View>
      {durationSec > 0 && (
        <Text style={styles.videoNoteDuration}>{durationSec} сек</Text>
      )}
    </TouchableOpacity>
  );
});

/** Видеокружок: data URL → file:// для плеера, затем воспроизведение по тапу, прогресс, loop. */
const VideoNoteBubble = memo(function VideoNoteBubble({ media }) {
  const styles = useContext(MessageBubbleStylesContext);
  const { playableUri, loading } = useResolvedVideoUri(media?.url);

  if (!media || media.type !== "videoNote" || !styles) return null;

  if (media?.url?.startsWith?.("data:") && loading) {
    return (
      <View style={styles.videoNoteContainer}>
        <View style={[styles.videoNoteCircle, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={styles.playIcon}>⏳</Text>
        </View>
        {(media.duration ?? 0) > 0 && (
          <Text style={styles.videoNoteDuration}>{media.duration} сек</Text>
        )}
      </View>
    );
  }

  if (media?.url?.startsWith?.("data:") && !playableUri) {
    return (
      <View style={styles.videoNoteContainer}>
        <View style={[styles.videoNoteCircle, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: "#999", fontSize: 12 }}>Не удалось загрузить</Text>
        </View>
      </View>
    );
  }

  if (!playableUri) return null;

  return <VideoNoteBubblePlayer videoUri={playableUri} media={media} styles={styles} />;
});

const ReactionsBar = memo(function ReactionsBar({
  messageId,
  reactions,
  onReactionPress,
}) {
  const styles = useContext(MessageBubbleStylesContext);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState(null);

  const handleAddReactionPress = (e) => {
    const x = e.nativeEvent?.pageX || 0;
    const y = e.nativeEvent?.pageY || 0;
    setPickerPosition({ x, y });
    setShowReactionPicker(true);
  };

  if (!styles) return null;
  if (!reactions || reactions.length === 0) {
    return (
      <>
        <TouchableOpacity
          style={styles.addReactionButtonStandalone}
          onPress={handleAddReactionPress}
        >
          <Text style={styles.addReactionIcon}>😊</Text>
        </TouchableOpacity>
        <ReactionPicker
          visible={showReactionPicker}
          position={pickerPosition}
          onSelect={(emoji) => {
            if (onReactionPress) onReactionPress(messageId, emoji);
          }}
          onClose={() => setShowReactionPicker(false)}
        />
      </>
    );
  }

  return (
    <>
      <View style={styles.reactionsContainer}>
        {reactions.map((reaction, index) => (
          <TouchableOpacity
            key={`${reaction.emoji}-${index}`}
            style={styles.reactionButton}
            onPress={() =>
              onReactionPress && onReactionPress(messageId, reaction.emoji)
            }
          >
            <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
            {reaction.count > 1 && (
              <Text style={styles.reactionCount}>{reaction.count}</Text>
            )}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.addReactionButton}
          onPress={handleAddReactionPress}
        >
          <Text style={styles.addReactionText}>+</Text>
        </TouchableOpacity>
      </View>
      <ReactionPicker
        visible={showReactionPicker}
        position={pickerPosition}
        onSelect={(emoji) => {
          if (onReactionPress) onReactionPress(messageId, emoji);
        }}
        onClose={() => setShowReactionPicker(false)}
      />
    </>
  );
});

function MessageBubble({ 
  message, 
  isMine, 
  showAvatar = true, 
  showName = false, 
  searchQuery = "",
  onReactionPress,
  currentUserId,
}) {
  const { colors } = useTheme();
  const time = formatTime(message.createdAt);
  const statusIcon = getStatusIcon(message.status);
  const statusColor = getStatusColor(message.status, colors);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          marginVertical: 2,
          paddingHorizontal: 12,
          alignItems: "flex-end",
        },
        containerMine: { justifyContent: "flex-end" },
        containerOther: { justifyContent: "flex-start" },
        bubbleContainer: {
          maxWidth: "75%",
          backgroundColor: colors.bubbleIn,
          borderRadius: 7.5,
          paddingHorizontal: 12,
          paddingVertical: 6,
          marginLeft: 8,
          borderTopLeftRadius: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.bubbleInBorder,
        },
        bubbleContainerMine: {
          backgroundColor: colors.bubbleOut,
          marginLeft: 0,
          marginRight: 8,
          borderTopLeftRadius: 7.5,
          borderTopRightRadius: 0,
          borderColor: "transparent",
        },
        bubbleContainerVideoNote: {
          backgroundColor: "transparent",
          paddingHorizontal: 0,
          paddingVertical: 0,
          borderWidth: 0,
          borderColor: "transparent",
        },
        authorName: {
          fontSize: 12,
          fontWeight: "600",
          color: colors.primary,
          marginBottom: 4,
        },
        replyContainer: {
          flexDirection: "row",
          marginBottom: 4,
          paddingLeft: 8,
          borderLeftWidth: 3,
          borderLeftColor: colors.replyBorder,
        },
        replyLine: {
          width: 3,
          backgroundColor: colors.primary,
          marginRight: 8,
        },
        replyAuthor: { fontSize: 12, fontWeight: "600", color: colors.primary },
        replyText: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
        text: {
          fontSize: 15,
          color: colors.text,
          lineHeight: 20,
        },
        textMine: { color: "#FFFFFF" },
        editedLabel: {
          fontSize: 11,
          color: colors.textMuted,
          fontStyle: "italic",
          marginTop: 2,
        },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 4,
          justifyContent: "flex-end",
        },
        time: { fontSize: 11, color: colors.textMuted, marginRight: 4 },
        timeMine: { color: "rgba(255,255,255,0.8)" },
        status: { fontSize: 14, color: colors.textSecondary },
        mediaImage: {
          width: "100%",
          maxWidth: 250,
          height: 200,
          borderRadius: 8,
          marginBottom: 4,
        },
        stickerEmojiBubble: { fontSize: 64, marginVertical: 4 },
        stickerImage: {
          width: 120,
          height: 120,
          borderRadius: 8,
          marginVertical: 4,
        },
        forwardedContainer: {
          marginBottom: 4,
          paddingBottom: 4,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        forwardedLabel: {
          fontSize: 12,
          color: colors.primary,
          fontWeight: "500",
        },
        videoRectContainer: {
          position: "relative",
          marginBottom: 4,
          width: 220,
          height: 160,
          borderRadius: 8,
          overflow: "hidden",
        },
        videoRectThumbnail: { width: 220, height: 160, borderRadius: 8 },
        playButtonRect: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: [{ translateX: -22 }, { translateY: -22 }],
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          justifyContent: "center",
          alignItems: "center",
        },
        videoNoteContainer: {
          position: "relative",
          marginBottom: 4,
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          alignSelf: "flex-start",
        },
        videoNoteCircle: {
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          borderRadius: VIDEO_NOTE_BUBBLE_SIZE / 2,
          overflow: "hidden",
          backgroundColor: colors.cardSecondary,
        },
        videoNoteImage: {
          ...StyleSheet.absoluteFillObject,
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          borderRadius: VIDEO_NOTE_BUBBLE_SIZE / 2,
        },
        videoNoteVideo: {
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          borderRadius: VIDEO_NOTE_BUBBLE_SIZE / 2,
        },
        videoNotePlayButton: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: [{ translateX: -22 }, { translateY: -22 }],
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          justifyContent: "center",
          alignItems: "center",
        },
        videoNoteProgressRing: {
          position: "absolute",
          top: 0,
          left: 0,
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          borderRadius: VIDEO_NOTE_BUBBLE_SIZE / 2,
          justifyContent: "center",
          alignItems: "center",
        },
        videoNoteProgressTrack: {
          position: "absolute",
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          borderRadius: VIDEO_NOTE_BUBBLE_SIZE / 2,
          borderWidth: 3,
          borderColor: "rgba(255,255,255,0.25)",
        },
        videoNoteProgressSegmentWrapper: {
          position: "absolute",
          top: 0,
          left: 0,
          width: VIDEO_NOTE_BUBBLE_SIZE,
          height: VIDEO_NOTE_BUBBLE_SIZE,
          justifyContent: "flex-start",
          alignItems: "center",
        },
        videoNoteProgressSegment: {
          width: 6,
          height: 3,
          marginTop: -1.5,
          backgroundColor: colors.primary,
          borderRadius: 1.5,
        },
        videoNoteDuration: {
          position: "absolute",
          bottom: 4,
          right: 4,
          fontSize: 11,
          color: "#fff",
          backgroundColor: "rgba(0,0,0,0.5)",
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 4,
        },
        playButton: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: [{ translateX: -22 }, { translateY: -22 }],
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(0, 0, 0, 0.55)",
          justifyContent: "center",
          alignItems: "center",
        },
        playIcon: { color: "#FFFFFF", fontSize: 18, marginLeft: 3 },
        videoThumbnailPlaceholder: {
          backgroundColor: colors.cardSecondary,
          justifyContent: "center",
          alignItems: "center",
        },
        videoModalOverlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.9)",
          justifyContent: "center",
          alignItems: "center",
        },
        videoModalContent: {
          width: "100%",
          aspectRatio: 16 / 9,
          maxHeight: "80%",
        },
        videoPlayer: { width: "100%", height: "100%" },
        audioContainer: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.reactionBg,
          borderRadius: 8,
          padding: 12,
          marginBottom: 4,
          minWidth: 180,
        },
        audioIcon: { fontSize: 20, marginRight: 12 },
        audioLabel: { fontSize: 14, color: colors.text },
        fileContainer: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.reactionBg,
          borderRadius: 8,
          padding: 12,
          marginBottom: 4,
        },
        fileIcon: { fontSize: 24, marginRight: 12 },
        fileInfo: { flex: 1 },
        fileName: {
          fontSize: 14,
          fontWeight: "500",
          color: colors.text,
          marginBottom: 2,
        },
        fileSize: { fontSize: 12, color: colors.textSecondary },
        reactionsContainer: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 4,
          alignItems: "center",
        },
        reactionButton: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.reactionBg,
          borderRadius: 12,
          paddingHorizontal: 6,
          paddingVertical: 2,
          marginRight: 4,
          marginTop: 2,
        },
        reactionEmoji: { fontSize: 14 },
        reactionCount: {
          fontSize: 11,
          color: colors.textSecondary,
          marginLeft: 2,
          fontWeight: "500",
        },
        addReactionButton: {
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: colors.border,
          justifyContent: "center",
          alignItems: "center",
          marginTop: 2,
        },
        addReactionButtonStandalone: {
          marginLeft: 8,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.reactionBg,
          justifyContent: "center",
          alignItems: "center",
        },
        addReactionText: { fontSize: 12, color: colors.textSecondary },
        addReactionIcon: { fontSize: 14 },
        highlightedPart: { backgroundColor: colors.highlight },
      }),
    [colors]
  );

  return (
    <MessageBubbleStylesContext.Provider value={styles}>
      <View style={[styles.container, isMine ? styles.containerMine : styles.containerOther]}>
        {!isMine && showAvatar && (
          <Avatar name={message.author?.name || "?"} size={32} />
        )}
        <View
          style={[
            styles.bubbleContainer,
            isMine && styles.bubbleContainerMine,
            message.media?.type === "videoNote" && !message.text && styles.bubbleContainerVideoNote,
          ]}
        >
          {showName && !isMine && (
            <Text style={styles.authorName}>{message.author?.name}</Text>
          )}
          <ForwardedLabel forwardedFromUser={message.forwardedFromUser} />
          <ReplyPreview replyTo={message.replyTo} />
          <MediaMessageBubble media={message.media} />
          <FileMessageBubble media={message.media} />
          {message.text && (
            <HighlightedText 
              text={message.text} 
              query={searchQuery}
              style={[styles.text, isMine && styles.textMine]}
            />
          )}
          {message.editedAt && (
            <Text style={styles.editedLabel}>ред.</Text>
          )}
          <View style={styles.footer}>
            <Text style={[styles.time, isMine && styles.timeMine]}>
              {time}
            </Text>
            {isMine && (
              <Text style={[styles.status, { color: statusColor }]}>{statusIcon}</Text>
            )}
          </View>
          <ReactionsBar
            messageId={message.id}
            reactions={message.reactions}
            onReactionPress={onReactionPress}
          />
        </View>
      </View>
    </MessageBubbleStylesContext.Provider>
  );
}

export default memo(MessageBubble);

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function getStatusIcon(status) {
  switch (status) {
    case "sending":
      return "🕐";
    case "sent":
      return "✓";
    case "delivered":
      return "✓✓";
    case "read":
      return "✓✓";
    default:
      return "✓";
  }
}

function getStatusColor(status, colors) {
  if (colors) {
    switch (status) {
      case "read":
        return colors.primary;
      case "delivered":
      case "sent":
        return colors.textSecondary;
      default:
        return colors.textMuted;
    }
  }
  switch (status) {
    case "read":
      return "#E53935";
    case "delivered":
    case "sent":
      return "#707579";
    default:
      return "#999999";
  }
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
