import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./PlaceSearch.module.css";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  placeName: string;
};

/** Ответ API Поиска по организациям (search-maps.yandex.ru/v1) */
type SearchMapsFeature = {
  type: string;
  geometry?: { type: string; coordinates?: number[] };
  properties?: {
    name?: string;
    description?: string;
    CompanyMetaData?: { name?: string; address?: string; Address?: { formatted?: string } };
  };
};

type Props = {
  /** Уже загружен ли API (например, карта на странице загрузила скрипт) */
  ymapsReady: boolean;
  onSelect: (result: PlaceSearchResult) => void;
  placeholder?: string;
  className?: string;
  /** Управляемое значение (адрес) */
  value?: string;
  onChange?: (value: string) => void;
  /** Ключ API Яндекса для поиска по организациям (search-maps.yandex.ru). Если не передан, используется только геокодер. */
  apiKey?: string;
};

export function PlaceSearch({
  ymapsReady,
  onSelect,
  placeholder = "Адрес или название места",
  className,
  value,
  onChange,
  apiKey,
}: Props) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = value !== undefined ? value : internalQuery;
  const setQuery = useCallback(
    (v: string) => {
      if (onChange) onChange(v);
      else setInternalQuery(v);
    },
    [onChange]
  );
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const search = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setError("");
    setLoading(true);
    setResults([]);

    const parseBizResponse = (data: { features?: SearchMapsFeature[] }): PlaceSearchResult[] => {
      const list: PlaceSearchResult[] = [];
      const features = data?.features ?? [];
      for (const f of features) {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) continue;
        // В Search API coordinates: [longitude, latitude]
        const longitude = coords[0];
        const latitude = coords[1];
        const name =
          f.properties?.name ??
          f.properties?.CompanyMetaData?.name ??
          f.properties?.description ??
          f.properties?.CompanyMetaData?.Address?.formatted ??
          f.properties?.CompanyMetaData?.address ??
          q;
        list.push({ latitude, longitude, placeName: String(name) });
      }
      return list;
    };

    const runSearch = () => {
      const geocodePromise =
        window.ymaps ?
          new Promise<PlaceSearchResult[]>((resolve, reject) => {
            window.ymaps!.geocode(q, { results: 8 })
              .then((res) => {
                const len = res.geoObjects.getLength();
                const list: PlaceSearchResult[] = [];
                for (let i = 0; i < len; i++) {
                  const obj = res.geoObjects.get(i) as {
                    geometry: { getCoordinates: () => number[] };
                    properties: { get: (key: string) => string };
                    getAddressLine?: () => string;
                  };
                  const coords = obj.geometry.getCoordinates();
                  if (!coords || coords.length < 2) continue;
                  const latitude = coords[0];
                  const longitude = coords[1];
                  const name =
                    (typeof obj.getAddressLine === "function" && obj.getAddressLine()) ||
                    obj.properties.get("text") ||
                    obj.properties.get("name") ||
                    obj.properties.get("description") ||
                    q;
                  list.push({ latitude, longitude, placeName: String(name || q) });
                }
                resolve(list);
              })
              .catch(reject);
          })
        : Promise.resolve<PlaceSearchResult[]>([]);

      const fetchBiz = (): Promise<PlaceSearchResult[]> =>
      apiKey ?
        fetch(
          `https://search-maps.yandex.ru/v1/?apikey=${encodeURIComponent(apiKey)}&text=${encodeURIComponent(q)}&lang=ru_RU&type=biz&results=8`
        )
          .then((r) => r.json())
          .then(parseBizResponse)
          .catch(() => [] as PlaceSearchResult[])
      : Promise.resolve<PlaceSearchResult[]>([]);

      const bizPromise = fetchBiz();

      Promise.all([bizPromise, geocodePromise])
        .then(([bizList, geoList]) => {
          const seen = new Set<string>();
          const merged: PlaceSearchResult[] = [];
          const add = (r: PlaceSearchResult) => {
            const key = `${r.latitude.toFixed(4)},${r.longitude.toFixed(4)}`;
            if (seen.has(key)) return;
            seen.add(key);
            merged.push(r);
          };
          bizList.forEach(add);
          geoList.forEach(add);
          setResults(merged);
          if (merged.length === 0) setError("Ничего не найдено");
        })
        .catch(() => {
          setError(
            "Ничего не найдено. Если ошибка повторяется, проверьте ключ API и включите «Геокодер» и «Поиск по организациям» в developer.tech.yandex.ru"
          );
        })
        .finally(() => setLoading(false));
    };

    if (window.ymaps) {
      window.ymaps.ready(runSearch);
    } else if (apiKey) {
      fetchBiz()
        .then((bizList) => {
          setResults(bizList);
          if (bizList.length === 0) setError("Ничего не найдено");
        })
        .finally(() => setLoading(false));
    } else {
      setError("Загрузка карты…");
      setLoading(false);
    }
  }, [query, apiKey]);

  useEffect(() => {
    if (!focused) setResults([]);
  }, [focused]);

  const showResults = focused && (results.length > 0 || loading || error);

  useEffect(() => {
    if (!showResults || !wrapRef.current) {
      setDropdownRect(null);
      return;
    }
    const el = wrapRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showResults]);

  const dropdownContent = showResults && (
    <div
      className={styles.results}
      style={
        dropdownRect
          ? {
              position: "fixed",
              top: dropdownRect.top + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }
          : undefined
      }
    >
      {loading && <div className={styles.status}>Поиск…</div>}
      {error && !loading && <div className={styles.error}>{error}</div>}
      {results.length > 0 && !loading && (
        <ul className={styles.list}>
          {(Array.isArray(results) ? results : []).map((r, i) => (
            <li key={i}>
              <button
                type="button"
                className={styles.item}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(r);
                  setQuery(r.placeName);
                  setResults([]);
                }}
              >
                <span className={styles.itemName}>{r.placeName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className ?? ""}`}>
      <div className={styles.row}>
        <input
          type="text"
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
          placeholder={placeholder}
          disabled={!ymapsReady}
        />
        <button
          type="button"
          className={styles.button}
          onClick={search}
          disabled={!ymapsReady || !query.trim() || loading}
        >
          {loading ? "…" : "Найти"}
        </button>
      </div>
      {typeof document !== "undefined" && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
}
