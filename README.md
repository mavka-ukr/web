# Мавка для Вебу

Приклад:

```html
<script src="https://веб.мавка.укр/mavka_web.js"></script>
<script>
(async () => {
  const VERSION = 'x.x.x'; // ВАЖЛИВО: тут вказувати версію npm пакета mavka, а не версію Мавки!

  const mavka = new Mavka(VERSION);

  await mavka.load();

  await mavka.write("привіт.м", 'друк("привіт!!!")');

  const resultCode = await mavka.run(["привіт.м"]);

  console.log('Mavka exited with code', resultCode);
})();
</script>
```

Більш детальний приклад у файлі `index.html`.