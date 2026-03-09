import { api } from "./client";

export type SuggestEventDescriptionResponse = {
  description: string;
};

export type SuggestEventDescriptionPayload = {
  title?: string;
  place?: string;
  draft?: string;
};

export async function suggestEventDescription(
  payload: SuggestEventDescriptionPayload
): Promise<SuggestEventDescriptionResponse> {
  return api.post<SuggestEventDescriptionResponse>(
    "/ai/suggest-event-description",
    payload
  );
}

