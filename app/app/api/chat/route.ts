import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'
import { embed } from '@/lib/embeddings'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function POST(req: NextRequest) {
  const { question } = await req.json()

  // 관련 청크 검색
  const queryEmb = await embed(`query: ${question}`)
  const { data: chunks } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmb,
    match_count: 5,
  })

  const context = (chunks as any[])?.map((c) => c.content).join('\n\n') || ''

  const prompt = context
    ? `당신은 테크솔루션즈의 사내 AI 비서입니다. 아래 회사 문서를 바탕으로 한국어로 간결하게 답변하세요. 문서에 없는 내용은 "해당 내용은 등록된 문서에서 찾을 수 없습니다"라고 답하세요.\n\n[회사 문서]\n${context}\n\n[질문]\n${question}`
    : `당신은 테크솔루션즈의 사내 AI 비서입니다. 현재 등록된 문서가 없습니다. "해당 내용은 등록된 문서에서 찾을 수 없습니다. 먼저 문서를 업로드해 주세요."라고 답하세요.`

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' })
  const result = await model.generateContentStream(prompt)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
