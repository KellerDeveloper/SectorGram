import { api } from './client'

export type CurrentUser = {
  id: string
  name: string
  email?: string
  avatar?: string | null
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return api.get<CurrentUser>('/users/me')
}

