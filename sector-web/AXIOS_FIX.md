# Решение проблемы с axios и crypto в React Native

## Проблема

Ошибка:
```
Unable to resolve module crypto from axios
crypto could not be found within the project
```

## Причина

Axios пытается использовать Node.js модуль `crypto`, который недоступен в React Native окружении.

## Решение ✅

**Axios заменен на `fetch`** - это нативное решение для React Native, которое работает без проблем.

### Что было сделано

1. ✅ Заменен `axios` на `fetch` в `src/api/client.js`
2. ✅ API клиент теперь использует нативный `fetch`
3. ✅ Удален импорт полифилла из `App.js` (больше не нужен)
4. ✅ `metro.config.js` настроен для исключения Node.js версии axios

### API клиент теперь использует fetch

```javascript
// Теперь используется fetch вместо axios
export const api = {
  get: (endpoint) => request(endpoint, { method: "GET" }),
  post: (endpoint, body) => request(endpoint, { method: "POST", body: JSON.stringify(body) }),
  // ...
};
```

### Перезапустите приложение

```bash
# Остановите Expo (Ctrl+C)
cd mobile
npx expo start --clear
```

## Преимущества fetch

- ✅ Нативный API, работает везде
- ✅ Не требует дополнительных зависимостей
- ✅ Меньший размер бандла
- ✅ Нет проблем с Node.js модулями

## Если нужен axios

Если все же нужен axios, можно использовать `axios` только для web версии:

```javascript
import axios from "axios";
import { Platform } from "react-native";

const api = Platform.OS === "web" 
  ? axios.create({ baseURL: API_BASE_URL })
  : fetchApi; // используем fetch для мобильных
```

Но `fetch` работает отлично для всех платформ!

## Проверка

После установки и перезапуска ошибка должна исчезнуть. Если нет:

1. Убедитесь, что пакет установлен: `npm list react-native-get-random-values`
2. Очистите кэш: `npx expo start --clear`
3. Перезапустите Metro bundler
