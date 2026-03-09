import { api } from './client'

export type SuggestMeetingIdeaResponse = { ideas: string }
export type SuggestMeetingIdeaPayload = {
  city?: string
  mood?: string
  exclude?: string[]
}

export async function suggestMeetingIdea(
  payload?: SuggestMeetingIdeaPayload,
): Promise<SuggestMeetingIdeaResponse> {
  return api.post<SuggestMeetingIdeaResponse>('/ai/suggest-meeting-idea', payload ?? {})
}
