## Деплой

- Фронтенд: https://bazhinakupi.nomorepartiessite.ru
- Бэкенд (API): https://api.bazhinakupi.nomorepartiessite.ru
- IP сервера: 158.160.209.183

## Технические примечания

- Бэкенд собирается на `node:16-alpine` — согласно требованиям.
- Фронтенд собирается на `node:18-alpine` вместо `node:16-alpine`. Это осознанное отклонение: зависимости `react-scripts`/`@testing-library` в текущей версии проекта требуют Node 18+ и не устанавливаются на Node 16 (сборка падает с ошибкой `EBADENGINE`). Сама сборка (`npm run build`) и рантайм-этап (`nginx:latest`) при этом полностью соответствуют остальным требованиям чек-листа.
