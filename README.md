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
