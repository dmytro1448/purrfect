// Telegram webhook
import { db, broadcast } from '../_shared/db.ts'
import { tg, sendTo, openAppMarkup, esc, APP_URL } from '../_shared/tg.ts'

const SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

Deno.serve(async (req) => {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== SECRET) return new Response('no', { status: 403 })
  const upd = await req.json().catch(() => ({}))
  const msg = upd.message
  if (!msg?.chat || msg.chat.type !== 'private') return new Response('ok')
  const text: string = msg.text ?? ''
  const chat = msg.chat.id

  try {
    if (text.startsWith('/start')) {
      const code = text.split(' ')[1]?.trim()
      if (code) {
        await tg('sendMessage', {
          chat_id: chat, parse_mode: 'HTML',
          text: '💞 Тебе запросили в спільний простір пари в <b>Purrfect</b>.\nНатисни кнопку — і ви з’єднаєтесь.',
          reply_markup: openAppMarkup('Приєднатися 💗', `?join=${encodeURIComponent(code)}`),
        })
      } else {
        await tg('sendMessage', {
          chat_id: chat, parse_mode: 'HTML',
          text: '🐾 <b>Purrfect</b> — ваш спільний простір на двох.\n\nСправи, покупки, рецепти, вішліст, місця, банка компліментів і котик, якого ви вирощуєте разом.\n\nПорада: напиши мені <code>+молоко, хліб</code> — і це одразу потрапить у список покупок.',
          reply_markup: openAppMarkup(),
        })
      }
      return new Response('ok')
    }

    if (text.startsWith('+')) {
      const { data: m } = await db.from('members').select('couple_id').eq('tg_id', msg.from.id).maybeSingle()
      if (!m?.couple_id) { await sendTo(chat, 'Спершу відкрий застосунок і створи пару 💗'); return new Response('ok') }
      const titles = text.slice(1).split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 30)
      if (titles.length) {
        await db.from('items').insert(titles.map((title) => ({ couple_id: m.couple_id, kind: 'shop', data: { title }, created_by: msg.from.id })))
        await broadcast(m.couple_id)
        await tg('sendMessage', { chat_id: chat, parse_mode: 'HTML', text: `🛒 Додано в покупки: ${titles.map(esc).join(', ')}`, reply_markup: openAppMarkup('Відкрити список', '') })
      }
      return new Response('ok')
    }

    await tg('sendMessage', { chat_id: chat, text: 'Відкривай Purrfect кнопкою нижче 🐾  (а «+щось» — додасть у покупки)', reply_markup: openAppMarkup() })
  } catch (e) { console.error(e) }
  return new Response('ok')
})

export { APP_URL }
