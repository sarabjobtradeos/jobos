import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { company, jobId } = await req.json()

    // Use Claude to research company and structure data
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
        tools: [{
          type: 'web_search_20250305',
          name: 'web_search',
        }],
        system: 'Research companies for job seekers. Respond ONLY in valid JSON after searching.',
        messages: [{
          role: 'user',
          content: `Search for "${company}" company and return key facts a job seeker needs.
          
Respond ONLY with this JSON (no markdown, no extra text):
{
  "glassdoor_rating": 4.2,
  "company_size": "1000-5000 employees",
  "company_industry": "Fintech",
  "founded": "2015",
  "headquarters": "Bengaluru, India",
  "company_news": [
    {"headline": "brief recent news item"},
    {"headline": "another news item"}
  ],
  "culture_summary": "one sentence about work culture based on reviews"
}`
        }],
      }),
    })

    const data = await response.json()

    // Extract text from response (may include tool use blocks)
    const textBlock = data.content?.find((b: any) => b.type === 'text')
    if (!textBlock?.text) return NextResponse.json({})

    const clean = textBlock.text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Company research error:', err)
    return NextResponse.json({})
  }
}
