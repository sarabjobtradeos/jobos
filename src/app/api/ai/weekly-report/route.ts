import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { weekData, profile } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You write encouraging, data-driven weekly job search summaries. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Write a weekly job search report for ${profile.full_name}.

WEEK DATA:
${JSON.stringify(weekData, null, 2)}

Respond ONLY with:
{
  "summary": "2-3 sentence encouraging summary of the week",
  "highlights": ["best thing that happened", "a promising lead", "a milestone"],
  "recommendations": ["do more of X next week", "try Y", "focus on Z"]
}`
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(clean))
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
