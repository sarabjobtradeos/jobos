import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const {
      jobTitle,
      company,
      jobDescription,
      baseResume,
      baseCoverLetter,
      region,
      candidateName,
      requestCoverLetter, // NEW: only generate cover letter if explicitly requested or Ireland
    } = await req.json()

    const isIreland = region === 'ireland'

    // Cover letter logic:
    // Ireland → always generate (recruiters read them)
    // India → only if requestCoverLetter is explicitly true (never for auto-apply)
    const shouldGenerateCoverLetter = isIreland || requestCoverLetter === true

    const regionContext = isIreland
      ? 'European/Irish job market standards. Use Euro salary references. No photo mention. DD/MM/YYYY date format. Mention GDPR familiarity where relevant.'
      : 'Indian job market standards. Use INR/LPA salary references. Include achievements in Indian company/scale context. No cover letter needed for Indian applications.'

    const coverLetterInstruction = shouldGenerateCoverLetter
      ? `Also tailor the cover letter provided. Make it specific to this company and role.`
      : `Do NOT generate a cover letter. Set "coverLetter" to empty string "" in your JSON response.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `You are an expert resume writer and job application specialist. You tailor resumes to maximise ATS scores and human relevance. You follow ${regionContext} Always respond in valid JSON only.`,
        messages: [{
          role: 'user',
          content: `Tailor this resume for the following job. Make keyword changes, reorder bullet points to match priorities.
${coverLetterInstruction}

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION:
${jobDescription}

BASE RESUME:
${baseResume}

${shouldGenerateCoverLetter && baseCoverLetter ? `BASE COVER LETTER:\n${baseCoverLetter}` : ''}

CANDIDATE NAME: ${candidateName}

Respond ONLY with this JSON structure:
{
  "resume": "full tailored resume text",
  "coverLetter": "${shouldGenerateCoverLetter ? 'full tailored cover letter text' : ''}",
  "fitScore": 8.5,
  "fitReasoning": "why this is a good/bad match",
  "jdIntelligence": {
    "what_they_want": "the real priority behind the JD in 2 sentences",
    "red_flags": ["any concerning phrases in the JD"],
    "lead_with": "which experience/skill to emphasise most",
    "urgency": "high|medium|low"
  },
  "keywordsAdded": ["keyword1", "keyword2"],
  "salaryBenchmark": {
    "min": 0,
    "max": 0,
    "currency": "${isIreland ? 'EUR' : 'INR'}",
    "insight": "is the salary fair for this role/location?"
  }
}`,
        }],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Tailor error:', err)
    return NextResponse.json({ error: 'Tailoring failed' }, { status: 500 })
  }
}
