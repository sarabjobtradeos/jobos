import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { jobTitle, company, jobDescription, resume, companyNews } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: 'You are an expert interview coach. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Generate an interview preparation card for this candidate.

ROLE: ${jobTitle} at ${company}
JOB DESCRIPTION: ${jobDescription?.slice(0, 1500)}
CANDIDATE RESUME: ${resume?.slice(0, 1000)}
COMPANY NEWS: ${companyNews || 'Not available'}

Respond ONLY with:
{
  "likely_questions": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "company_insight": "2-3 sentences about what matters to this company right now and what to mention",
  "lead_with": "the single most important thing to establish early in the interview",
  "talking_points": [
    "specific achievement or story to highlight",
    "relevant experience to mention",
    "a smart question to ask the interviewer"
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
