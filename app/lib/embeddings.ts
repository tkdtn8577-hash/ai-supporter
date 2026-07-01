import { pipeline, env } from '@xenova/transformers'

env.allowLocalModels = false
env.useBrowserCache = false

type EmbeddingPipeline = Awaited<ReturnType<typeof pipeline>>
let extractor: EmbeddingPipeline | null = null

async function getExtractor(): Promise<EmbeddingPipeline> {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/multilingual-e5-small')
  }
  return extractor
}

export async function embed(text: string): Promise<number[]> {
  const pipe = await getExtractor()
  const output = await pipe(text, { pooling: 'mean', normalize: true } as any)
  return Array.from((output as any).data) as number[]
}
