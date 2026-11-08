const KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
// deno-lint-ignore no-explicit-any
export async function aiJson(system: string, user: string): Promise<any> {
  if (!KEY) throw new Error('no_ai')
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 900, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
  })
  const j = await r.json()
  return JSON.parse(j.choices?.[0]?.message?.content ?? '{}')
}
