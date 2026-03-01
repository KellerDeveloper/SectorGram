import { API_BASE, getToken } from "./client";

export type VideoNoteResult = {
  url: string;
  thumbnailUrl: string | null;
  duration: number | null;
  size: number | null;
};

export async function uploadVideoNote(
  file: File,
  duration?: number,
  size?: number
): Promise<VideoNoteResult> {
  const token = getToken();
  const url = `${API_BASE}/media/upload/video-note`;
  const form = new FormData();
  form.append("file", file);
  if (duration != null) form.append("duration", String(duration));
  if (size != null) form.append("size", String(size));

  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error ?? "Ошибка загрузки") as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return data as VideoNoteResult;
}
