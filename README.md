# Мавка Web

Мавка для переглядача.

## Встановлення

```shell
npm i mavka-web
```

## Використання

```js
import { createMavkaWeb } from 'mavka-web';

const mavka = createMavkaWeb();

mavka.context.set('друк', mavka.tools.fn((args) => {
  console.log(...args);
}));

await mavka.eval('друк("Привіт від Лесі!")');
```
