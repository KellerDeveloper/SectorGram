import { api } from './client'

export type AuthResponse = {
  token: string
  user: {
    id: string
    email: string
    name: string
    avatar?: string | null
  }
}

export async function loginWithTelegramWebApp(
  initData: string,
): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/telegram-webapp', { initData })
}

