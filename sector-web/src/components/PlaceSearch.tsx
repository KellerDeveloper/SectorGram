import { useCallback, useEffect, useState } from "react";
import styles from "./PlaceSearch.module.css";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  placeName: string;
};

declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      geocode: (
        query: string | number[],
        options?: object
      ) => Promise<{
        geoObjects: {
          get: (index: number) => {
            geometry: { getCoordinates: () => number[] };
            properties: { get: (key: string) => string };
          };
          getLength: () => number;
        };
      }>;
    };
  }
}

type Props = {
  /** Уже загружен ли API (например, карта на странице загрузила скрипт) */
  ymapsReady: boolean;
  onSelect: (result: PlaceSearchResult) => void;
  placeholder?: string;
  className?: string;
};

export function PlaceSearch({
  ymapsReady,
  onSelect,
  placeholder = "Адрес или название места",
  className,
}: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const search = useCallback(() => {
    const q = query.trim();
    if (!q || !window.ymaps) return;
    setError("");
    setLoading(true);
    setResults([]);
    window.ymaps
      .geocode(q)
      .then((res) => {
        const len = res.geoObjects.getLength();
        const list: PlaceSearchResult[] = [];
        for (let i = 0; i < Math.min(len, 8); i++) {
          const obj = res.geoObjects.get(i);
          const coords = obj.geometry.getCoordinates();
          // В API Яндекса координаты [долгота, широта]
          const longitude = coords[0];
          const latitude = coords[1];
          const name =
            obj.properties.get("name") ||
            obj.properties.get("description") ||
            obj.properties.get("text") ||
            q;
          list.push({ latitude, longitude, placeName: name });
        }
        setResults(list);
      })
      .catch(() => {
        setError("Ничего не найдено");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [query]);

  useEffect(() => {
    if (!focused) setResults([]);
  }, [focused]);

  const showResults = focused && (results.length > 0 || loading || error);

  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
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
      {showResults && (
        <div className={styles.results}>
          {loading && <div className={styles.status}>Поиск…</div>}
          {error && !loading && <div className={styles.error}>{error}</div>}
          {results.length > 0 && !loading && (
            <ul className={styles.list}>
              {results.map((r, i) => (
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
      )}
    </div>
  );
}
