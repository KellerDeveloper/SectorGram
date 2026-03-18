import { api } from './client'

export type CurrentUser = {
  id: string
  name: string
  email?: string
  avatar?: string | null
}

export type UserRating = {
  userId: string
  name: string
  username?: string
  avatar?: string | null
  createdEvents: number
  attendedEvents: number
  interestScore: number
  ratingScore: number
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return api.get<CurrentUser>('/users/me')
}

export async function getUserRatings(limit = 50): Promise<UserRating[]> {
  const data = await api.get<{ items: UserRating[] }>(
    `/users/ratings?limit=${encodeURIComponent(String(limit))}`,
  )
  return Array.isArray(data.items) ? data.items : []
}

