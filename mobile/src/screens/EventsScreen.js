import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  ScrollView,
  Linking,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { useEvents } from "../hooks/useEvents";

function formatDateTime(value) {
  if (!value) return "Не указано";
  try {
    const date = new Date(value);
    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

export default function EventsScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const { colors } = useTheme();

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [startsAt, setStartsAt] = useState(
    new Date(Date.now() + 60 * 60 * 1000).toISOString()
  );
  const [endsAt, setEndsAt] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    joinEvent,
    leaveEvent,
  } = useEvents(token);

  useEffect(() => {
    navigation.setOptions({
      title: "Мероприятия",
    });
    loadEvents();
  }, [navigation, loadEvents]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },
        content: {
          flex: 1,
        },
        createCard: {
          margin: 16,
          padding: 16,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        createTitleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: creating ? 12 : 0,
        },
        createTitle: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.text,
        },
        createToggle: {
          paddingHorizontal: 8,
          paddingVertical: 4,
        },
        createToggleText: {
          fontSize: 14,
          color: colors.primary,
          fontWeight: "500",
        },
        input: {
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingHorizontal: 10,
          paddingVertical: Platform.OS === "ios" ? 10 : 8,
          fontSize: 14,
          color: colors.text,
          backgroundColor: colors.inputBg,
          marginBottom: 8,
        },
        inputMultiline: {
          height: 72,
          textAlignVertical: "top",
        },
        helperText: {
          fontSize: 12,
          color: colors.textSecondary,
          marginBottom: 8,
        },
        errorText: {
          fontSize: 13,
          color: "#D32F2F",
          marginTop: 4,
          marginBottom: 4,
        },
        createButton: {
          marginTop: 4,
          borderRadius: 8,
          backgroundColor: colors.primary,
          paddingVertical: 10,
          alignItems: "center",
        },
        createButtonDisabled: {
          backgroundColor: colors.textSecondary,
        },
        createButtonText: {
          fontSize: 15,
          fontWeight: "600",
          color: "#FFFFFF",
        },
        listHeader: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        listTitle: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.text,
        },
        listCount: {
          fontSize: 13,
          color: colors.textSecondary,
        },
        eventCard: {
          marginHorizontal: 16,
          marginVertical: 6,
          padding: 14,
          borderRadius: 12,
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        eventTitleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        },
        eventTitle: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          flex: 1,
          marginRight: 8,
        },
        eventBadge: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: colors.primary,
        },
        eventBadgeText: {
          fontSize: 11,
          color: "#FFFFFF",
          fontWeight: "500",
        },
        eventMetaRow: {
          marginTop: 6,
        },
        eventMetaText: {
          fontSize: 13,
          color: colors.textSecondary,
          marginTop: 2,
        },
        eventActionsRow: {
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 10,
        },
        primaryButton: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          backgroundColor: colors.primary,
          marginLeft: 8,
        },
        primaryButtonText: {
          fontSize: 14,
          fontWeight: "600",
          color: "#FFFFFF",
        },
        secondaryButton: {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.card,
        },
        secondaryButtonText: {
          fontSize: 14,
          fontWeight: "500",
          color: colors.text,
        },
        footerSpacer: {
          height: 24,
        },
        emptyContainer: {
          paddingVertical: 40,
          alignItems: "center",
        },
        emptyText: {
          fontSize: 15,
          color: colors.textSecondary,
        },
        globalError: {
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 8,
        },
      }),
    [colors, creating]
  );

  const handleSubmit = async () => {
    if (!title.trim() || !place.trim() || !startsAt.trim()) {
      setSubmitError("Название, место и время начала обязательны");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createEvent({
        title: title.trim(),
        place: place.trim(),
        startsAt: startsAt.trim(),
        endsAt: endsAt.trim() || undefined,
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        location:
          latitude.trim() || longitude.trim()
            ? {
                latitude: latitude.trim()
                  ? Number.parseFloat(latitude.trim())
                  : undefined,
                longitude: longitude.trim()
                  ? Number.parseFloat(longitude.trim())
                  : undefined,
              }
            : undefined,
      });
      setTitle("");
      setPlace("");
      setDescription("");
      setEndsAt("");
      setCoverImage("");
      setLatitude("");
      setLongitude("");
      setCreating(false);
    } catch (e) {
      setSubmitError(e.message || "Не удалось создать мероприятие");
    } finally {
      setSubmitting(false);
    }
  };

  const renderEvent = ({ item }) => {
    const creatorId = item.creator?.id || item.creatorId || item.creator?._id;
    const isCreator = creatorId && user?.id && String(creatorId) === String(user.id);
    const participants = Array.isArray(item.participants) ? item.participants : [];
    const isParticipant =
      !!user &&
      participants.some(
        (p) => String(p.id || p._id) === String(user.id)
      );

    const canJoin = !isParticipant;
    const canLeave = isParticipant && !isCreator;

    const openInYandexMaps = () => {
      if (item.location && (item.location.latitude || item.location.longitude)) {
        const lat = item.location.latitude;
        const lon = item.location.longitude;
        if (typeof lat === "number" && typeof lon === "number") {
          const url = `https://yandex.ru/maps/?ll=${encodeURIComponent(
            String(lon)
          )}%2C${encodeURIComponent(String(lat))}&z=16&pt=${encodeURIComponent(
            String(lon)
          )},${encodeURIComponent(String(lat))},pm2rdl`;
          Linking.openURL(url).catch(() => {});
          return;
        }
      }
      if (item.place) {
        const url = `https://yandex.ru/maps/?text=${encodeURIComponent(
          item.place
        )}`;
        Linking.openURL(url).catch(() => {});
      }
    };

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {isCreator && (
            <View style={styles.eventBadge}>
              <Text style={styles.eventBadgeText}>Организатор</Text>
            </View>
          )}
        </View>

        <View style={styles.eventMetaRow}>
          <Text style={styles.eventMetaText}>
            📍 {item.place}
          </Text>
          <Text style={styles.eventMetaText}>
            🕒 {formatDateTime(item.startsAt)}
            {item.endsAt ? ` — ${formatDateTime(item.endsAt)}` : ""}
          </Text>
          <Text style={styles.eventMetaText}>
            👥 Участников: {participants.length}
          </Text>
        </View>

        {item.description ? (
          <Text style={styles.eventMetaText} numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.eventActionsRow}>
          {item.chatId && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                navigation.navigate("Chat", {
                  chatId: item.chatId,
                  title: item.title,
                  chatType: "group",
                })
              }
            >
              <Text style={styles.secondaryButtonText}>Открыть чат</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openInYandexMaps}
          >
            <Text style={styles.secondaryButtonText}>Открыть в Яндекс.Картах</Text>
          </TouchableOpacity>

          {canJoin && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => joinEvent(item.id)}
            >
              <Text style={styles.primaryButtonText}>Вступить</Text>
            </TouchableOpacity>
          )}

          {canLeave && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => leaveEvent(item.id)}
            >
              <Text style={styles.primaryButtonText}>Покинуть</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.createCard}>
          <View style={styles.createTitleRow}>
            <Text style={styles.createTitle}>Создать мероприятие</Text>
            <TouchableOpacity
              onPress={() => setCreating((prev) => !prev)}
              style={styles.createToggle}
            >
              <Text style={styles.createToggleText}>
                {creating ? "Скрыть" : "Показать"}
              </Text>
            </TouchableOpacity>
          </View>

          {creating && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Название*"
                value={title}
                onChangeText={setTitle}
              />
              <TextInput
                style={styles.input}
                placeholder="Место проведения*"
                value={place}
                onChangeText={setPlace}
              />
              <TextInput
                style={styles.input}
                placeholder="Дата/время начала* (ISO)"
                value={startsAt}
                onChangeText={setStartsAt}
              />
              <Text style={styles.helperText}>
                Формат: 2026-03-01T18:00:00.000Z
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Дата/время окончания (ISO, опционально)"
                value={endsAt}
                onChangeText={setEndsAt}
              />
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Описание (опционально)"
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <TextInput
                style={styles.input}
                placeholder="Ссылка на обложку (опционально)"
                value={coverImage}
                onChangeText={setCoverImage}
              />
              <TextInput
                style={styles.input}
                placeholder="Широта (опционально, для Яндекс.Карт)"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Долгота (опционально, для Яндекс.Карт)"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
              />
              {submitError && (
                <Text style={styles.errorText}>{submitError}</Text>
              )}
              <TouchableOpacity
                style={[
                  styles.createButton,
                  submitting ? styles.createButtonDisabled : null,
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={styles.createButtonText}>
                  {submitting ? "Создание..." : "Создать"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Ближайшие мероприятия</Text>
          <Text style={styles.listCount}>{events.length}</Text>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEvent}
          scrollEnabled={false}
          ListEmptyComponent={
            !loading && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  Пока нет запланированных мероприятий
                </Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadEvents} />
          }
          ListFooterComponent={<View style={styles.footerSpacer} />}
        />

        {error && (
          <View style={styles.globalError}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

