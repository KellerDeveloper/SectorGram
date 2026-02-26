# Установка Node.js и npm

## Проблема
Вы получили ошибку `npm: command not found` - это означает, что Node.js и npm не установлены на вашем компьютере.

## Решение для macOS

### Вариант 1: Установка через Homebrew (рекомендуется)

Если у вас установлен Homebrew:

```bash
# Установите Homebrew (если еще не установлен)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установите Node.js (включает npm)
brew install node

# Проверьте установку
node --version
npm --version
```

### Вариант 2: Официальный установщик (самый простой)

1. Перейдите на https://nodejs.org/
2. Скачайте LTS версию (рекомендуется)
3. Запустите установщик и следуйте инструкциям
4. Перезапустите терминал

### Вариант 3: Через nvm (Node Version Manager)

Полезно, если нужно управлять несколькими версиями Node.js:

```bash
# Установите nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Перезапустите терминал или выполните:
source ~/.zshrc  # или ~/.bash_profile для bash

# Установите последнюю LTS версию Node.js
nvm install --lts

# Используйте установленную версию
nvm use --lts

# Проверьте установку
node --version
npm --version
```

## Проверка установки

После установки выполните в терминале:

```bash
node --version  # должно показать v18.x.x или выше
npm --version   # должно показать 9.x.x или выше
```

## После установки

1. **Перезапустите терминал** (важно!)
2. Перейдите в папку проекта:
   ```bash
   cd /Users/dmitrijkeller/Documents/XCodeProj/sector
   ```
3. Запустите проект снова:
   ```bash
   ./start.sh backend
   ```

## Решение проблем

### Команда все еще не найдена после установки

1. **Перезапустите терминал** - это важно!
2. Проверьте PATH:
   ```bash
   echo $PATH
   ```
   Должен содержать путь к Node.js (обычно `/usr/local/bin` или `~/.nvm/versions/node/...`)

3. Если используете nvm, убедитесь, что он загружен:
   ```bash
   source ~/.zshrc  # для zsh
   # или
   source ~/.bash_profile  # для bash
   ```

### Проверка, где установлен Node.js

```bash
which node
which npm
```

Если команды ничего не возвращают, Node.js не в PATH.

### Для Homebrew

Если установили через Homebrew, но команда не работает:

```bash
# Добавьте Homebrew в PATH (если нужно)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

## Требования

- **Node.js**: версия 18 или выше
- **npm**: версия 9 или выше (обычно идет вместе с Node.js)

## Дополнительная информация

- Официальный сайт Node.js: https://nodejs.org/
- Документация npm: https://docs.npmjs.com/
- Homebrew: https://brew.sh/
- nvm: https://github.com/nvm-sh/nvm
