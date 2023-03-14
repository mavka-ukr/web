# Мавка для переглядача

## Встановлення

```shell
npm i mavka-web
```

## Використання

```js
import mavkaWeb from 'mavka-web';

mavkaWeb.context.set('друк', mavkaWeb.tools.fn((args) => {
  console.log(...args);
}));

await mavkaWeb.eval('друк("Привіт від Лесі!")');
```
