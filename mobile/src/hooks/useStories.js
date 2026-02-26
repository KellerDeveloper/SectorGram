import { useState, useCallback } from "react";
import { api } from "../api/client";

/**
 * Лента: массив { userId, user: { id, name, avatar }, stories: [...] }
 * Каждая story: { id, type, media?, text?, createdAt, viewedBy }
 */
export function useStories(token) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeed = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/stories");
      setFeed(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Не удалось загрузить истории");
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchUserStories = useCallback(
    async (userId) => {
      if (!token) return null;
      try {
        const { data } = await api.get(`/stories/user/${userId}`);
        return data;
      } catch (e) {
        return null;
      }
    },
    [token]
  );

  const createStory = useCallback(
    async (payload) => {
      if (!token) throw new Error("Не авторизован");
      const { data } = await api.post("/stories", payload);
      await fetchFeed();
      return data;
    },
    [token, fetchFeed]
  );

  const markViewed = useCallback(
    async (storyId) => {
      if (!token) return;
      try {
        await api.post(`/stories/${storyId}/view`);
        setFeed((prev) =>
          prev.map((entry) => ({
            ...entry,
            stories: entry.stories.map((s) =>
              s.id === storyId
                ? {
                    ...s,
                    viewedBy: [
                      ...(s.viewedBy || []),
                      { userId: null, viewedAt: new Date().toISOString() },
                    ],
                  }
                : s
            ),
          }))
        );
      } catch (_) {}
    },
    [token]
  );

  const deleteStory = useCallback(
    async (storyId) => {
      if (!token) return;
      await api.delete(`/stories/${storyId}`);
      await fetchFeed();
    },
    [token, fetchFeed]
  );

  return {
    feed,
    loading,
    error,
    fetchFeed,
    fetchUserStories,
    createStory,
    markViewed,
    deleteStory,
  };
}
