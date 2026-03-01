/**
 * Открыть точку в Яндекс.Картах (тот же формат, что в iOS: pt=lon,lat).
 */
export function openYandexMapsPoint(lat: number, lon: number): void {
  const pt = `${lon},${lat}`;
  window.open(`https://yandex.ru/maps/?pt=${encodeURIComponent(pt)}&z=16`, "_blank", "noopener");
}

/**
 * Построить маршрут в Яндекс.Картах: от текущего местоположения до (toLat, toLon).
 * Если геолокация недоступна — открывает только точку назначения.
 */
export function openYandexMapsRoute(toLat: number, toLon: number): void {
  if (!navigator.geolocation) {
    openYandexMapsPoint(toLat, toLon);
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const fromLat = position.coords.latitude;
      const fromLon = position.coords.longitude;
      // rtext = lat,lon~lat,lon (старт ~ конец), как в iOS RouteLocationHelper
      const rtext = `${fromLat},${fromLon}~${toLat},${toLon}`;
      window.open(
        `https://yandex.ru/maps/?rtext=${encodeURIComponent(rtext)}`,
        "_blank",
        "noopener"
      );
    },
    () => {
      openYandexMapsPoint(toLat, toLon);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}
