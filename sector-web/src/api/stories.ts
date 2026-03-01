import { api } from "./client";

export type StoryItem = {
  id: string;
  type: "photo" | "text";
  media?: { url?: string; thumbnail?: string };
  text?: string;
  createdAt: string;
  viewedBy?: { userId?: string; viewedAt?: string }[];
};

export type StoryFeedUser = {
  userId: string;
  user: { id: string; name: string; avatar?: string };
  stories: StoryItem[];
};

export type UserStoriesData = {
  userId: string;
  user: { id: string; name: string; avatar?: string };
  stories: StoryItem[];
};

export async function getStories(): Promise<StoryFeedUser[]> {
  return api.get<StoryFeedUser[]>("/stories");
}

export async function getUserStories(userId: string): Promise<UserStoriesData> {
  return api.get<UserStoriesData>(`/stories/user/${userId}`);
}

export type CreateStoryPayload =
  | { type: "text"; text: string }
  | { type: "photo"; media: { url: string; thumbnail?: string } };

export async function createStory(payload: CreateStoryPayload): Promise<StoryItem & { user?: { id: string; name: string; avatar?: string } }> {
  return api.post("/stories", payload);
}

export async function viewStory(storyId: string): Promise<{ ok: boolean }> {
  return api.post(`/stories/${storyId}/view`);
}

export async function deleteStory(storyId: string): Promise<{ deleted: boolean }> {
  return api.delete(`/stories/${storyId}`);
}
