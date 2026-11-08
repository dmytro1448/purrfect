# Purrfect — контракт даних і API

Telegram Mini App для пари (Дмитро та Надійчик). Український інтерфейс. Бекенд: Supabase Edge Function `api`.
Фронтенд викликає ТІЛЬКИ `web/src/api/index.js` (`api.call(method, params)`), який сам обирає real або mock.

## Транспорт
`POST {VITE_API_URL}` body `{ method, params }`, header `X-Init-Data: Telegram.WebApp.initData`.
Відповідь: `{ ok: true, data }` або `{ ok: false, error }`. Клієнт кидає `Error(error)`.
Mock-режим: якщо `VITE_API_URL` порожній або в URL є `?mock=1` → `web/src/api/mock.js` (localStorage, та ж семантика).

## Сутності
```
Member  { tg_id:number, name:string, avatar_url:string|null, color:'pink'|'violet' }
Couple  { id, name, started_at:'YYYY-MM-DD', tz:'Europe/Riga', invite_code, bot_username,
          cat: { name, xp, level, level_title, hunger:0..100, mood:0..100, streak, last_fed_at, last_pet_at, accessory } }
Item    { id, kind, data:{...}, done:boolean, created_by:tg_id, created_at, updated_at }
```
`me` → `{ member: Member|null, couple: Couple|null, partner: Member|null, invite_link: string|null }`
Якщо `couple === null` → показати онбординг (створити пару або вставити код запрошення).

## Види items (kind) і поля data
| kind | data | примітки |
|---|---|---|
| `shop` | `{ title, qty?, category? }` | done = куплено |
| `task` | `{ title, place?, who:'both'|tg_id, type:'once'|'weekly'|'monthly', weekday?:0-6 (0=нд), every_months?:n, month_day?:1-31, due?:'YYYY-MM-DD', remind_days?:n, reactions?:{[tg_id]:emoji} }` | done на повторюваній → сервер зсуває `due` на наступний цикл і лишає done=false |
| `reminder` | `{ title, time:'HH:MM', days:[0..6] (порожній = щодня), who:'both'|tg_id, enabled:boolean }` | бот пише в час |
| `recipe` | `{ title, photo?, description?, ingredients?, steps?, tags?:string[], minutes? }` | колесо випадкового рецепту |
| `wish` | `{ title, list:'gift'|'watch'|'dream', owner:tg_id, url?, image?, price?, note?, reserved_by?:tg_id, prep_note? }` | ПРИВАТНІСТЬ: якщо viewer == owner, сервер видаляє `reserved_by`/`prep_note` |
| `place` | `{ title, lat?, lng?, address?, status:'been'|'want', category?, rating?:1-5, note?, photos?:string[], visited_at? }` | |
| `date` | `{ title, date:'YYYY-MM-DD', place_id?, note?, photos?:string[], kind:'date'|'trip' }` | лічильники «побачень/поїздок» |
| `idea` | `{ title, emoji?, cost?:'free'|'$'|'$$', vibe?:'home'|'out'|'active' }` | колесо побачень |
| `compliment` | `{ text, to:tg_id, opened_at? }` | ПРИВАТНІСТЬ: для отримувача текст невідкритих прихований (`text:null`) |
| `photo` | `{ url, caption?, taken_at?, date_id?, place_id? }` | спільний альбом / таймлайн |
| `special` | `{ title, date:'YYYY-MM-DD', yearly:boolean, remind_days?:n, emoji? }` | важливі дати, бот нагадує |
| `checkin` | `{ week:'2026-W45', by:tg_id, answers:{[qid]:1-5}, note? }` | відповіді партнера видно лише після своєї |

## Методи
- `me` → див. вище
- `onboard` `{ my_name, partner_name, couple_name, started_at, cat_name }` → `me`
- `join` `{ code, my_name }` → `me`
- `couple.update` `{ name?, started_at?, cat_name?, my_name? }` → `me`
- `items.list` `{ kinds?: string[] }` → `Item[]` (свіжі зверху)
- `items.create` `{ kind, data }` → `Item`
- `items.update` `{ id, data?: (merge), done?: boolean }` → `Item`
- `items.delete` `{ id }` → `{ ok:true }`
- `compliment.open` → `Item|null` (відкриває 1 випадковий неотриманий; не більше 1 на добу, інакше error `already_opened_today`)
- `pet.action` `{ action:'feed'|'pet'|'play' }` → `Couple.cat` (feed: hunger→100 раз на 4 год; pet/play: +mood)
- `upload.sign` `{ ext:'jpg'|'png'|'webp' }` → `{ upload_url, public_url }` (PUT файлу на upload_url)
- `link.preview` `{ url }` → `{ title?, image?, price? }`

## Котик (сервер рахує)
XP: виконана справа +5, покупка +1, комплімент +3, відкритий комплімент +2, чек-ін +10, побачення +15, місце +5, фото +2, feed +2, pet +1.
level = floor(sqrt(xp/20)) + 1. Титули: 1 Кошеня, 2 Муркотик, 3 Пухнастик, 4 Хазяїн дивану, 5 Королівський кіт, 7+ Легенда муркотіння.
hunger падає на ~4/год, mood ~2/год. streak — днів поспіль, коли хтось із пари щось зробив.

## Нагадування бота (cron кожні 5 хв, Europe/Riga)
- `reminder` у свій час/дні → кому `who`.
- `task` з `due`: о 10:00 в день `due - remind_days` і в день дедлайну.
- `special`: о 10:00 за `remind_days` і в сам день.
- Котик голодний (hunger < 25) → раз на добу о 19:00.
- Новий комплімент → партнеру «тебе чекає записка в банці 💌».

## AI (OpenAI gpt-4o-mini, на сервері)
- `ai.recipe` `{ url?: string, text?: string }` → `{ title, description, ingredients, steps, tags:string[], minutes?, photo? }` — розбирає рецепт з посилання або вставленого тексту (українською). Використати в шиті «Додати рецепт» кнопкою «✨ Заповнити з посилання/тексту».
- `ai.ideas` `{ vibe?: 'home'|'out'|'active', cost?: 'free'|'$'|'$$', count?: number }` → `[{ title, emoji, cost, vibe }]` — ідеї побачень (Рига/Латвія, сезон враховано). Кнопка «✨ Підкинути ідей» у Колесі побачень; користувач обирає, які зберегти як `idea`.
