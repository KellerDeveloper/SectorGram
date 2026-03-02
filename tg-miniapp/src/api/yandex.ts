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
    throw new Error('Ошибка запроса к Яндекс.Картам')
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

