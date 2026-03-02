export type YandexPlace = {
  label: string
  latitude: number
  longitude: number
}

const YANDEX_API_KEY = import.meta.env.VITE_YMAPS_API_KEY

export async function searchPlaces(query: string): Promise<YandexPlace[]> {
  if (!query.trim()) return []

  if (!YANDEX_API_KEY) {
    throw new Error('Не настроен VITE_YMAPS_API_KEY для поиска по карте')
  }

  const params = new URLSearchParams({
    format: 'json',
    lang: 'ru_RU',
    apikey: YANDEX_API_KEY,
    results: '5',
    geocode: query,
  })

  const res = await fetch(
    `https://geocode-maps.yandex.ru/1.x/?${params.toString()}`,
  )
  if (!res.ok) {
    const status = res.status
    const text = await res.text().catch(() => '')

    let message = `Ошибка Яндекс.Карт (HTTP ${status})`
    try {
      const data = text ? (JSON.parse(text) as any) : null
      const apiMessage =
        data?.message || data?.error || data?.description || data?.detail
      if (apiMessage && typeof apiMessage === 'string') {
        message += `: ${apiMessage}`
      }
    } catch {
      // ignore JSON parse error
    }

    // Дополнительный лог в консоль, чтобы можно было посмотреть сырой ответ.
    // В проде это просто появится в DevTools, на бэкенд ничего не уходит.
    console.error('Yandex geocode error', status, text)

    throw new Error(message)
  }

  const data = (await res.json()) as any
  const members: any[] =
    data?.response?.GeoObjectCollection?.featureMember ?? []

  return members.map((m) => {
    const obj = m.GeoObject
    const name = obj?.name ?? ''
    const desc = obj?.description ?? ''
    const label = [name, desc].filter(Boolean).join(', ')

    const pos: string = obj?.Point?.pos ?? ''
    const [lonStr, latStr] = pos.split(' ')
    const latitude = Number(latStr)
    const longitude = Number(lonStr)

    return {
      label: label || query,
      latitude,
      longitude,
    }
  })
}

