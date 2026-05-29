import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, company, appliedAt, candidateName, previousFollowups } = await req.json()

    const tone = previousFollowups === 0 ? 'polite and professional first follow-up' : 'brief second check-in, not pushy'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: 'You write concise, professional follow-up emails for job applications. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Write a ${tone} for this application.

CANDIDATE: ${candidateName}
JOB: ${jobTitle} at ${company}
APPLIED ON: ${appliedAt}
FOLLOW-UP NUMBER: ${previousFollowups + 1}

Respond ONLY with:
{
  "subject": "email subject line",
  "body": "full email body (3-4 sentences max, no fluff)"
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
