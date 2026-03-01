import { useCallback, useEffect, useState } from "react";
import styles from "./PlaceSearch.module.css";

export type PlaceSearchResult = {
  latitude: number;
  longitude: number;
  placeName: string;
};

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
    const runGeocode = () => {
      if (!window.ymaps) return;
      window.ymaps
        .geocode(q, { results: 8 })
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
            // В API Яндекса координаты [широта, долгота]
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
          setResults(list);
          if (list.length === 0) setError("Ничего не найдено");
        })
        .catch(() => {
          setError("Ничего не найдено");
        })
        .finally(() => {
          setLoading(false);
        });
    };
    window.ymaps.ready(runGeocode);
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
