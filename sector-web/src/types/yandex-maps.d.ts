/** Типы для глобального API Яндекс.Карт (script api-maps.yandex.ru/2.1) */
declare global {
  interface Window {
    ymaps?: {
      ready: (cb: () => void) => void;
      Map: new (
        element: string | HTMLElement,
        state: { center: number[]; zoom: number },
        options?: object
      ) => {
        geoObjects: { add: (obj: unknown) => void; remove: (obj: unknown) => void };
        events: { add: (type: string, handler: (e: { get: (key: string) => number[] }) => void) => void };
        setCenter: (center: number[]) => void;
        destroy: () => void;
      };
      Placemark: new (coords: number[], properties?: object, options?: object) => unknown;
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

export {};
