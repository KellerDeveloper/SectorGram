import { api } from './client'

export type AdminUserRow = {
  userId: string
  name: string
  username?: string
  avatar?: string | null
  telegramId?: string
  createdEvents: number
  attendedEvents: number
  interestScore: number
  ratingScore: number
}

export type AdminUsersResponse = {
  items: AdminUserRow[]
  total: number
}

export type AdminEventRow = {
  _id: string
  title: string
  startsAt: string
  endsAt?: string
  place: string
  status: string
  creatorId?: { _id: string; name: string; avatar?: string | null; telegramId?: string }
  participants?: { _id: string; name: string; avatar?: string | null; telegramId?: string }[]
}

export type AdminEventsResponse = {
  items: AdminEventRow[]
}

export type AdminReminderRow = {
  _id: string
  eventId: { _id: string; title: string; place?: string; startsAt?: string }
  userId: { _id: string; name: string; telegramId?: string }
  type: '1h' | '3h'
  remindAt: string
  sent: boolean
}

export type AdminRemindersResponse = {
  items: AdminReminderRow[]
}

export async function adminGetUsers(params?: {
  query?: string
  limit?: number
  offset?: number
}): Promise<AdminUsersResponse> {
  const query = params?.query?.trim()
  const limit = params?.limit ?? 50
  const offset = params?.offset ?? 0

  const qs = new URLSearchParams()
  if (query) qs.set('query', query)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))

  return api.get<AdminUsersResponse>(`/admin/users?${qs.toString()}`)
}

export async function adminGetUserDetails(userId: string): Promise<AdminUserRow> {
  return api.get<AdminUserRow>(`/admin/users/${encodeURIComponent(userId)}`)
}

export async function adminListEvents(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<AdminEventsResponse> {
  const status = params?.status
  const limit = params?.limit ?? 50
  const offset = params?.offset ?? 0

  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))

  return api.get<AdminEventsResponse>(`/admin/events?${qs.toString()}`)
}

export async function adminCancelEvent(eventId: string) {
  return api.post(`/admin/events/${encodeURIComponent(eventId)}/cancel`)
}

export async function adminCompleteEvent(eventId: string) {
  return api.post(`/admin/events/${encodeURIComponent(eventId)}/complete`)
}

export async function adminGetReminders(params?: {
  eventId?: string
  userId?: string
  sent?: boolean
}): Promise<AdminRemindersResponse> {
  const qs = new URLSearchParams()
  if (params?.eventId) qs.set('eventId', params.eventId)
  if (params?.userId) qs.set('userId', params.userId)
  if (typeof params?.sent === 'boolean') qs.set('sent', String(params.sent))

  return api.get<AdminRemindersResponse>(`/admin/reminders?${qs.toString()}`)
}

export async function adminSendReminderNow(reminderId: string) {
  return api.post(`/admin/reminders/${encodeURIComponent(reminderId)}/send`)
}

export async function adminResetReminder(reminderId: string) {
  return api.post(`/admin/reminders/${encodeURIComponent(reminderId)}/reset`)
}

export type AdminBroadcastType = 'all' | 'event_participants'

export type AdminBroadcastResponse = {
  success: boolean
  recipients: number
}

export async function adminBroadcast(payload: {
  type: AdminBroadcastType
  message: string
  eventId?: string
}): Promise<AdminBroadcastResponse> {
  return api.post<AdminBroadcastResponse>('/admin/broadcast', payload)
}

export async function adminStatsUsers(params?: { limit?: number }) {
  const limit = params?.limit ?? 20
  return api.get<{ items: AdminUserRow[] }>(`/admin/stats/users?limit=${encodeURIComponent(String(limit))}`)
}

export type AdminStatsEvent = {
  id: string
  title: string
  startsAt: string
  place: string
  status: string
  participantsCount: number
  creator: { id: string; name: string; avatar?: string | null } | null
}

export async function adminStatsEvents(params?: { limit?: number }) {
  const limit = params?.limit ?? 10
  return api.get<{ items: AdminStatsEvent[] }>(
    `/admin/stats/events?limit=${encodeURIComponent(String(limit))}`,
  )
}

export type AdminAuditLogRow = {
  id: string
  admin: { id: string; name: string; username?: string; avatar?: string | null; telegramId?: string } | null
  action: string
  targetType: string
  targetId: string
  payload: any
  createdAt: string
}

export async function adminGetAudit(params?: { limit?: number; offset?: number }) {
  const limit = params?.limit ?? 50
  const offset = params?.offset ?? 0
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))

  return api.get<{ items: AdminAuditLogRow[] }>(`/admin/audit?${qs.toString()}`)
}

