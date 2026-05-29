import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, company, candidateName, candidateBackground, region } = await req.json()

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
        system: 'You write concise, effective cold outreach emails for job seekers to recruiters/hiring managers. Never generic. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Write a cold outreach LinkedIn message or email to the hiring manager at ${company} for a ${jobTitle} role.

CANDIDATE: ${candidateName}
BACKGROUND: ${candidateBackground}
REGION: ${region}

Rules:
- Under 100 words
- Specific to the company
- Lead with a genuine reason for interest
- Clear ask (15 min call)
- No "I hope this finds you well" or generic openers

Respond ONLY with:
{
  "subject": "email subject (if email)",
  "linkedin_message": "short LinkedIn message version (under 300 chars)",
  "email_body": "slightly longer email version"
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
