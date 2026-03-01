import { useCallback, useEffect, useRef, useState } from "react";

type YandexMapInstance = {
  geoObjects: { add: (obj: unknown) => void; remove: (obj: unknown) => void };
  events: { add: (type: string, handler: (e: { get: (key: string) => number[] }) => void) => void };
  setCenter: (center: number[]) => void;
  destroy: () => void;
};

type Props = {
  apiKey: string;
  center: [number, number];
  zoom?: number;
  /** Режим просмотра: показать метку. Режим выбора: по клику вызывать onPointSelect */
  mode: "view" | "pick";
  onPointSelect?: (lat: number, lon: number) => void;
  className?: string;
};

export function YandexEventMap({ apiKey, center, zoom = 16, mode, onPointSelect, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YandexMapInstance | null>(null);
  const placemarkRef = useRef<unknown>(null);
  const [ready, setReady] = useState(!!window.ymaps);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiKey) {
      setError("Не задан ключ карт");
      return;
    }
    if (window.ymaps) {
      setReady(true);
      return;
    }
    const scriptId = "yandex-maps-api";
    if (document.getElementById(scriptId)) {
      const check = setInterval(() => {
        if (window.ymaps) {
          setReady(true);
          clearInterval(check);
        }
      }, 100);
      return () => clearInterval(check);
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError("Не удалось загрузить карты");
    document.head.appendChild(script);
    return () => {
      if (!document.getElementById(scriptId)) return;
      script.remove();
    };
  }, [apiKey]);

  const centerRef = useRef(center);
  centerRef.current = center;

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.ymaps || mapRef.current) return;
    const initialCenter = centerRef.current;
    const ymaps = window.ymaps;
    if (!ymaps) return;
    ymaps.ready(() => {
      if (!containerRef.current || !window.ymaps) return;
      const y = window.ymaps;
      try {
        const map = new y.Map(
          containerRef.current,
          { center: initialCenter, zoom },
          { suppressMapOpenBlock: true }
        );
        mapRef.current = map;
        if (mode === "view") {
          const placemark = new y.Placemark(
            initialCenter,
            {},
            { preset: "islands#redIcon" }
          );
          placemarkRef.current = placemark;
          map.geoObjects.add(placemark);
        }
        if (mode === "pick" && onPointSelect) {
          map.events.add("click", (e: { get: (key: string) => number[] }) => {
            const coords = e.get("coords");
            const ymapsApi = window.ymaps;
            if (coords && coords.length >= 2 && ymapsApi) {
              onPointSelect(coords[0], coords[1]);
              if (placemarkRef.current) {
                map.geoObjects.remove(placemarkRef.current as never);
              }
              const placemark = new ymapsApi.Placemark(
                coords,
                {},
                { preset: "islands#redIcon" }
              );
              placemarkRef.current = placemark;
              map.geoObjects.add(placemark);
            }
          });
        }
      } catch (err) {
        setError("Ошибка инициализации карты");
      }
    });
  }, [zoom, mode, onPointSelect]);

  useEffect(() => {
    if (!ready || !window.ymaps) return;
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        placemarkRef.current = null;
      }
    };
  }, [ready, initMap]);

  useEffect(() => {
    const y = window.ymaps;
    if (!mapRef.current || !y) return;
    mapRef.current.setCenter(center);
    if (mode === "view") {
      if (placemarkRef.current) mapRef.current.geoObjects.remove(placemarkRef.current as never);
      const placemark = new y.Placemark(center, {}, { preset: "islands#redIcon" });
      placemarkRef.current = placemark;
      mapRef.current.geoObjects.add(placemark);
    }
  }, [center, mode]);

  if (!apiKey) return null;
  if (error) return <div className={className}>{error}</div>;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "280px", minHeight: "200px" }}
    />
  );
}
