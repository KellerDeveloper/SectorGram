import { useCallback, useState } from "react";
import {
  fetchEvents,
  createEvent as apiCreateEvent,
  joinEvent as apiJoinEvent,
  leaveEvent as apiLeaveEvent,
} from "../api/events";

export function useEvents(token) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sortEvents = useCallback((list) => {
    return [...list].sort((a, b) => {
      const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
      const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
      return aTime - bTime;
    });
  }, []);

  const loadEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchEvents();
      setEvents(sortEvents(list));
    } catch (e) {
      setError(e.message || "Не удалось загрузить мероприятия");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [token, sortEvents]);

  const createEvent = useCallback(
    async (payload) => {
      if (!token) {
        throw new Error("Не авторизован");
      }
      const created = await apiCreateEvent(payload);
      setEvents((prev) => sortEvents([created, ...prev]));
      return created;
    },
    [token, sortEvents]
  );

  const joinEvent = useCallback(
    async (eventId) => {
      if (!token) {
        throw new Error("Не авторизован");
      }
      const updated = await apiJoinEvent(eventId);
      setEvents((prev) =>
        sortEvents(prev.map((e) => (e.id === updated.id ? updated : e)))
      );
      return updated;
    },
    [token, sortEvents]
  );

  const leaveEvent = useCallback(
    async (eventId) => {
      if (!token) {
        throw new Error("Не авторизован");
      }
      const updated = await apiLeaveEvent(eventId);
      setEvents((prev) =>
        sortEvents(prev.map((e) => (e.id === updated.id ? updated : e)))
      );
      return updated;
    },
    [token, sortEvents]
  );

  return {
    events,
    loading,
    error,
    loadEvents,
    createEvent,
    joinEvent,
    leaveEvent,
    setEvents,
  };
}

