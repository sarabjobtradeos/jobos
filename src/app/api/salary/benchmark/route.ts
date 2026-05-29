import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, location, region, yearsExperience } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        system: 'You benchmark salaries for job seekers. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Search for current 2025 salary range for "${jobTitle}" in ${location} with ${yearsExperience} years experience.

Respond ONLY with:
{
  "min": 1500000,
  "max": 2800000,
  "currency": "${region === 'ireland' ? 'EUR' : 'INR'}",
  "median": 2000000,
  "insight": "one sentence — is this role paying well in this market right now?"
}`
        }],
      }),
    })

    const data = await response.json()
    const textBlock = data.content?.find((b: any) => b.type === 'text')
    if (!textBlock?.text) return NextResponse.json({})

    const clean = textBlock.text.replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(clean))
  } catch (err) {
    return NextResponse.json({})
  }
}
