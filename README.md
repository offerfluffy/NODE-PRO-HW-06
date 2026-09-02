# HW-06

## Як запустити локально

Встановити залежності:

```bash
npm ci
```

Запустити тести:

```bash
npm test
```

## Як запустити в Docker

Запустити тести в контейнері:

```bash
docker compose run --rm api npm test
```

## Як це працює

TypeScript сам не зберігає типи параметрів у runtime. Коли увімкнені
`experimentalDecorators` і `emitDecoratorMetadata`, компілятор додає metadata для
декорованих класів. Саме звідти `reflect-metadata` дає контейнеру значення
`design:paramtypes`. Контейнер читає цей масив через
`Reflect.getMetadata("design:paramtypes", target)`, рекурсивно створює залежності,
а потім передає їх у constructor. Якщо `emitDecoratorMetadata` вимкнути,
`design:paramtypes` не буде згенеровано, контейнер не побачить залежності класу і
не зможе автоматично їх підставити. Для interface або інших типів, яких немає в
runtime, використовується явний токен через `@Inject(...)`

Параметр-декоратор отримує `target`, назву методу і `parameterIndex`.
Саме `parameterIndex` показує, у яку позицію масиву аргументів треба покласти
значення під час HTTP-виклику. Тому `@Param("id")`, `@Query("limit")` і
`@Body()` тільки записують metadata на метод, наприклад: індекс `0` взяти з
path-параметра `id`, індекс `1` взяти з query-параметра `limit`. Під час
обробки запиту dispatcher читає цю metadata, будує `args[index]`, а потім
викликає метод контролера як звичайну функцію: `handler(...args)`.

## Життєвий цикл запиту

```txt
HTTP request
  ↓
middleware
  ↓
guard
  ↓
interceptor:before
  ↓
pipe
  ↓
handler
  ↓
interceptor:after
  ↓
HTTP response

Якщо будь-який етап кидає помилку:

error → exception filter → HTTP error response
```

`AsyncLocalStorage` використовується для `requestId`, бо створює ізольоване
сховище для кожного запиту. Якщо зберігати `requestId` у глобальній змінній, то
поки один запит чекає на `await`, інший запит може перезаписати це значення. Коли
перший запит продовжить виконання, він прочитає вже чужий `requestId`.
`AsyncLocalStorage` прив'язує значення до async-контексту конкретного запиту,
тому сервіс або логер може прочитати правильний `requestId` без передачі його
через параметри кожної функції.
