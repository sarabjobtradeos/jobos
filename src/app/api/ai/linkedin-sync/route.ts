import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { profile } = await req.json()

    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `You are a LinkedIn profile optimisation expert for job seekers.

Profile data:
- Name: ${profile.name}
- Current title: ${profile.title}
- Summary: ${profile.summary}
- Skills: ${profile.skills?.join(', ')}
- Target roles: ${profile.targetRoles?.join(', ')}
- Years experience: ${profile.yearsExp}
- Target region: ${profile.region}

Generate 6 specific LinkedIn profile improvement suggestions. Return ONLY valid JSON:
{
  "profileScore": <number 40-85>,
  "suggestions": [
    {
      "id": "<unique_id>",
      "section": "<LinkedIn section name>",
      "icon": "<single emoji>",
      "priority": "high|medium|low",
      "current": "<what they likely have now, inferred from profile>",
      "suggested": "<exact text they should use, tailored to their profile>",
      "reason": "<why this matters, with specific stat if possible>",
      "impact": "<short impact label like '+40% visibility'>"
    }
  ]
}

Make suggestions highly specific to their actual profile data — use their real job title, skills, target roles, and region. Not generic advice.`
      }]
    })

    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
