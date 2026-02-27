import { api } from "./client";

export async function fetchEvents() {
  const { data } = await api.get("/events");
  return Array.isArray(data) ? data : [];
}

export async function fetchEventById(eventId) {
  const { data } = await api.get(`/events/${eventId}`);
  return data;
}

export async function createEvent(payload) {
  const { data } = await api.post("/events", payload);
  return data;
}

export async function joinEvent(eventId) {
  const { data } = await api.post(`/events/${eventId}/join`, {});
  return data;
}

export async function leaveEvent(eventId) {
  const { data } = await api.post(`/events/${eventId}/leave`, {});
  return data;
}

