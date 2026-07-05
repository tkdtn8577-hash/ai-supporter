'use client'

import { useState } from 'react'
import AnimateOnScroll from '@/components/ui/AnimateOnScroll'
import { works } from '@/lib/works'
import { type Work } from '@/lib/types'

const CATEGORIES = ['전체', '웹사이트', '랜딩페이지', '쇼핑몰'] as const

export default function Works() {
  const [filter, setFilter] = useState<string>('전체')
  const [lightbox, setLightbox] = useState<Work | null>(null)

  const filtered = filter === '전체' ? works : works.filter(w => w.category === filter)

  return (
    <section id="works" className="py-32 px-6 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="text-zinc-600 text-sm tracking-widest uppercase mb-4">Works</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-10 leading-tight">
            직접 만든<br />결과물들
          </h2>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 mb-12 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  filter === c
                    ? 'bg-white text-black font-medium'
                    : 'border border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((work, i) => (
            <AnimateOnScroll key={work.id} delay={i * 0.05}>
              <div
                onClick={() => work.url ? window.open(work.url, '_blank') : setLightbox(work)}
                className="group rounded-2xl border border-zinc-800 overflow-hidden cursor-pointer hover:border-zinc-600 transition-all duration-300"
              >
                {/* 썸네일 placeholder */}
                <div className="aspect-video bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                  <span className="text-zinc-700 text-sm">{work.category}</span>
                </div>
                <div className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{work.title}</p>
                    <span className="text-zinc-600 text-xs mt-1 block">{work.category}</span>
                  </div>
                  <span className="text-zinc-700 group-hover:text-zinc-400 transition-colors text-lg">
                    {work.url ? '↗' : '⊕'}
                  </span>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>

      {/* 라이트박스 모달 */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden max-w-lg w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="aspect-video bg-zinc-800 flex items-center justify-center">
              <span className="text-zinc-600 text-sm">이미지 준비 중</span>
            </div>
            <div className="p-5 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{lightbox.title}</p>
                <span className="text-zinc-600 text-xs">{lightbox.category}</span>
              </div>
              <button onClick={() => setLightbox(null)} className="text-zinc-500 hover:text-white text-xl">×</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
