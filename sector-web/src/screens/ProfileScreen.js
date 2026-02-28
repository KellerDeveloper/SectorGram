import React, { useContext, useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api/client";
import Avatar from "../components/Avatar";
import { useTheme } from "../theme/ThemeContext";

export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const { colors, themeMode, setThemeMode } = useTheme();
  const [profile, setProfile] = useState(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.card },
        header: {
          alignItems: "center",
          paddingVertical: 32,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        name: { fontSize: 24, fontWeight: "600", color: colors.text, marginTop: 16 },
        avatarImage: { width: 80, height: 80, borderRadius: 40 },
        email: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
        username: { fontSize: 14, color: colors.primary, marginTop: 4 },
        bio: {
          fontSize: 14,
          color: colors.textSecondary,
          marginTop: 8,
          textAlign: "center",
          paddingHorizontal: 32,
        },
        section: {
          marginTop: 16,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        menuItem: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        menuText: { fontSize: 16, color: colors.text },
        menuArrow: { fontSize: 20, color: colors.textMuted },
        logoutText: { color: colors.danger },
        themeRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        themeChips: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        themeChip: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        },
        themeChipActive: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        themeChipText: {
          fontSize: 13,
          color: colors.textSecondary,
        },
        themeChipTextActive: {
          color: "#FFFFFF",
        },
      }),
    [colors]
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProfile();
    });
    loadProfile();
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      const res = await api.get("/users/me");
      setProfile(res.data);
    } catch (error) {
      console.error("Ошибка загрузки профиля:", error);
    }
  };

  const displayProfile = profile || user;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {displayProfile?.avatar ? (
          <Image source={{ uri: displayProfile.avatar }} style={styles.avatarImage} />
        ) : (
          <Avatar name={displayProfile?.name || "U"} size={80} />
        )}
        <Text style={styles.name}>{displayProfile?.name || "Пользователь"}</Text>
        <Text style={styles.email}>{displayProfile?.email}</Text>
        {displayProfile?.username && (
          <Text style={styles.username}>@{displayProfile.username}</Text>
        )}
        {displayProfile?.bio && (
          <Text style={styles.bio}>{displayProfile.bio}</Text>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Text style={styles.menuText}>Редактировать профиль</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.themeRow}>
            <Text style={styles.menuText}>Тема</Text>
          </View>
          <View style={styles.themeChips}>
            {[
              { key: "system", label: "Система" },
              { key: "light", label: "Светлая" },
              { key: "dark", label: "Тёмная" },
            ].map((opt) => {
              const active = themeMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setThemeMode(opt.key)}
                  style={[
                    styles.themeChip,
                    active && styles.themeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.themeChipText,
                      active && styles.themeChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={signOut}>
          <Text style={[styles.menuText, styles.logoutText]}>Выйти</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
