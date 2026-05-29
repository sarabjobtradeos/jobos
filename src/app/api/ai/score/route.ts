import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resume, region, targetRoles, skills } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: 'You are a recruitment expert scoring job-candidate fit. Respond ONLY in valid JSON.',
        messages: [{
          role: 'user',
          content: `Score this candidate's fit for this job on a scale of 1.0 to 10.0.

TARGET ROLES: ${targetRoles.join(', ')}
CANDIDATE SKILLS: ${skills.join(', ')}
REGION: ${region}

JOB DESCRIPTION:
${jobDescription.slice(0, 2000)}

CANDIDATE RESUME SUMMARY:
${resume.slice(0, 1500)}

Respond ONLY with:
{
  "score": 8.5,
  "reasoning": "concise 2-sentence explanation",
  "recommend": true
}`
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    return NextResponse.json(JSON.parse(clean))
  } catch (err) {
    console.error('Score error:', err)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
