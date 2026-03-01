import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** Управляемое значение (адрес) */
  value?: string;
  onChange?: (value: string) => void;
};

export function PlaceSearch({
  ymapsReady,
  onSelect,
  placeholder = "Адрес",
  className,
  value,
  onChange,
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
          setLoading(false);
        })
        .catch(() => {
          setError(
            "Ничего не найдено. Проверьте ключ API и включите «Геокодер» в developer.tech.yandex.ru"
          );
          setLoading(false);
        });
    };
    window.ymaps.ready(runGeocode);
  }, [query]);

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
