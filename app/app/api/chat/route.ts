import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from '@/lib/supabase'
import { embed } from '@/lib/embeddings'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

interface HistoryItem {
  role: 'user' | 'assistant'
  content: string
}

const SYSTEM_PROMPTS: Record<string, string> = {
  company: '당신은 테크솔루션즈의 친근한 사내 AI 비서 ARIA입니다. 자연스럽게 대화하며, 아래 회사 문서를 참고해 한국어로 답변하세요. 문서에 없는 내용은 솔직하게 모른다고 말하고, 일반적인 질문에는 자유롭게 대화하세요.',
  yami: '당신은 YAMI YAMI의 친근한 개인 사업 AI 비서 YAMI입니다. 자연스럽게 대화하며, 아래 사업 문서를 참고해 한국어로 답변하세요. 문서에 없는 내용은 솔직하게 모른다고 말하고, 일반적인 질문에는 자유롭게 대화하세요.',
}

export async function POST(req: NextRequest) {
  try {
    const { question, history = [], workspace = 'company' }: { question: string; history: HistoryItem[]; workspace: string } = await req.json()

    let context = ''
    try {
      const queryEmb = await embed(question)
      const { data: chunks, error: rpcError } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmb,
        match_count: 5,
        filter_workspace: workspace,
      })
      if (rpcError) throw new Error(`DB 오류: ${rpcError.message}`)
      console.log('[chunks]', chunks?.length, chunks?.[0]?.content?.slice(0, 50))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context = (chunks as any[])?.map((c) => c.content).join('\n\n') || ''
    } catch (embErr) {
      console.error('[embed/search error]', embErr)
      const encoder = new TextEncoder()
      const errMsg = `⚠️ 문서 검색 중 시스템 오류가 발생했습니다.\n\n**오류 내용**: ${String(embErr)}\n\n잠시 후 다시 시도해 주세요.`
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(errMsg))
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      )
    }

    const basePrompt = SYSTEM_PROMPTS[workspace] ?? SYSTEM_PROMPTS.company
    const systemInstruction = context
      ? `${basePrompt}\n\n[참고 문서]\n${context}`
      : `${basePrompt} 문서 관련 질문이 들어오면 "아직 등록된 문서가 없어요. 파일을 업로드해 주시면 도와드릴게요!"라고 안내하세요.`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction })

    const chatHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))

    const chat = model.startChat({ history: chatHistory })
    const result = await chat.sendMessageStream(question)

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

    return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch (err) {
    console.error('[chat route error]', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
