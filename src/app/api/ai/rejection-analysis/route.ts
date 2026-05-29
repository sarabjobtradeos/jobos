import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { rejectedApplications } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: 'You are a career coach who analyses job application patterns. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Analyse these rejected job applications and identify patterns.

REJECTED APPLICATIONS:
${JSON.stringify(rejectedApplications, null, 2)}

Respond ONLY with:
{
  "patterns": [
    "pattern 1 (e.g. mostly rejected at companies over 500 employees)",
    "pattern 2",
    "pattern 3"
  ],
  "recommendations": [
    "actionable fix 1",
    "actionable fix 2",
    "actionable fix 3"
  ],
  "targetAdjustments": [
    "adjust targeting to focus more on X",
    "avoid applying to Y type of role"
  ]
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
