import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { embed } from '@/lib/embeddings'

function chunkText(text: string, size = 500): string[] {
  const paragraphs = text.split(/\n\n+/)
  const chunks: string[] = []
  let current = ''
  for (const para of paragraphs) {
    if ((current + para).length > size && current) {
      chunks.push(current.trim())
      current = para
    } else {
      current += (current ? '\n\n' : '') + para
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks.filter((c) => c.length > 20)
}

async function parseFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  if (ext === 'txt' || ext === 'csv') {
    return buffer.toString('utf-8')
  }
  if (ext === 'pdf') {
    const pdfMod = await import('pdf-parse')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParse = (pdfMod as any).default ?? pdfMod
    const data = await pdfParse(buffer)
    return data.text
  }
  if (ext === 'docx') {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  if (ext === 'xlsx') {
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    return wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name]
      return XLSX.utils.sheet_to_csv(ws)
    }).join('\n\n')
  }
  throw new Error(`지원하지 않는 형식: ${ext}`)
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File
  const workspace = (formData.get('workspace') as string) || 'company'

  if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

  const { data: existing } = await supabase
    .from('documents')
    .select('id')
    .eq('filename', file.name)
    .eq('workspace', workspace)
    .single()
  if (existing) await supabase.from('documents').delete().eq('id', existing.id)

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({ filename: file.name, source: 'upload', workspace })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const text = await parseFile(file)
  const chunks = chunkText(text)

  const batchSize = 5
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const rows = await Promise.all(
      batch.map(async (content, j) => {
        const embedding = await embed(content)
        return { document_id: doc.id, content, embedding, chunk_index: i + j }
      })
    )
    await supabase.from('document_chunks').insert(rows)
  }

  return NextResponse.json({ success: true, filename: file.name, chunks: chunks.length })
}
