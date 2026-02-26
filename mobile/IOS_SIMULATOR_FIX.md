# Решение проблем с iOS симулятором

## Ошибка: Invalid device or device pair

Если вы получили ошибку:
```
Error: xcrun simctl boot ... exited with non-zero code: 148
Invalid device or device pair: ...
```

## Решение 1: Выбрать другой симулятор (рекомендуется)

1. **Остановите Expo** (Ctrl+C)

2. **Список доступных симуляторов:**
   ```bash
   xcrun simctl list devices
   ```

3. **Запустите Expo снова:**
   ```bash
   npm start
   ```

4. **Нажмите `i`** и выберите симулятор из списка

## Решение 2: Использовать web версию (самый простой)

Вместо iOS симулятора используйте web версию:

```bash
npm start
# Нажмите 'w' для web версии
```

Или напрямую:
```bash
npm run web
```

## Решение 3: Очистить кэш и перезапустить

```bash
# Остановите Expo (Ctrl+C)

# Очистите кэш
npx expo start --clear

# Или полная очистка
rm -rf node_modules
npm install
npx expo start --clear
```

## Решение 4: Запустить конкретный симулятор

```bash
# Список доступных симуляторов
xcrun simctl list devices available

# Запустите конкретный симулятор
xcrun simctl boot "iPhone 15 Pro"

# Затем запустите Expo
npm start
# Нажмите 'i'
```

## Решение 5: Использовать реальное устройство

1. Установите **Expo Go** на iPhone:
   - App Store: https://apps.apple.com/app/expo-go/id982107779

2. Запустите Expo:
   ```bash
   npm start
   ```

3. Отсканируйте QR-код камерой iPhone

## Решение 6: Проверить Xcode

Убедитесь, что Xcode установлен и настроен:

```bash
# Проверьте установку
xcode-select -p

# Если не установлен, установите через App Store
# Затем настройте:
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

## Решение 7: Перезапустить симуляторы

```bash
# Закрыть все симуляторы
killall Simulator

# Запустить заново
open -a Simulator
```

## Быстрое решение

**Самый простой способ** - использовать web версию:

```bash
cd mobile
npm run web
```

Откроется браузер с приложением - работает так же хорошо!

## Проверка доступных устройств

```bash
# Показать все доступные симуляторы
xcrun simctl list devices

# Показать только загруженные
xcrun simctl list devices | grep Booted

# Загрузить конкретный симулятор
xcrun simctl boot "iPhone 15"
```

## Дополнительная информация

- Expo документация: https://docs.expo.dev/workflow/ios-simulator/
- Проблемы с симулятором: https://docs.expo.dev/troubleshooting/clear-cache/
