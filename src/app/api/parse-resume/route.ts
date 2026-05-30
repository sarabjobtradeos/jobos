import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF using pdf-parse
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    
    return NextResponse.json({ 
      text: data.text,
      pages: data.numpages,
      wordCount: data.text.split(/\s+/).filter(Boolean).length
    })
  } catch (err: any) {
    console.error('PDF parse error:', err)
    // Return empty text rather than failing — upload will still work
    return NextResponse.json({ text: '', pages: 0, wordCount: 0 })
  }
}
