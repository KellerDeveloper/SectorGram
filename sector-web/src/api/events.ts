import { api } from "./client";

export type EventParticipant = { id: string; name?: string; avatar?: string };
export type EventLocation = { latitude?: number; longitude?: number } | null;

export type Event = {
  id: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  place: string;
  coverImage?: string;
  location: EventLocation;
  status: string;
  creatorId: string;
  creator?: { id: string; name: string; avatar?: string } | null;
  participants: EventParticipant[];
  chatId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEventPayload = {
  title: string;
  place: string;
  startsAt: string;
  endsAt?: string;
  description?: string;
  coverImage?: string;
  location?: { latitude?: number; longitude?: number };
};

export async function getEvents(): Promise<Event[]> {
  return api.get<Event[]>("/events");
}

export async function getEvent(id: string): Promise<Event> {
  return api.get<Event>(`/events/${id}`);
}

export async function createEvent(payload: CreateEventPayload): Promise<Event> {
  return api.post<Event>("/events", payload);
}

export async function joinEvent(id: string): Promise<Event> {
  return api.post<Event>(`/events/${id}/join`);
}

export async function leaveEvent(id: string): Promise<Event> {
  return api.post<Event>(`/events/${id}/leave`);
}
