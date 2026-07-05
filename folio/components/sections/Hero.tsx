'use client'

import { motion } from 'framer-motion'

export default function Hero() {
  function scrollToContact() {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero" className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-black relative overflow-hidden">
      {/* 배경 그라데이션 오브 */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-4xl"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-zinc-500 text-sm tracking-widest uppercase mb-6"
        >
          Web Agency
        </motion.p>

        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight tracking-tight mb-6">
          첫인상이 곧<br />
          <span className="text-zinc-400">브랜드입니다.</span>
        </h1>

        <p className="text-zinc-500 text-lg md:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
          소상공인과 스타트업을 위한 압도적인 웹사이트.<br />
          빠르게, 정확하게, 혼자 다 합니다.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={scrollToContact}
            className="px-8 py-3.5 rounded-full bg-white text-black font-medium hover:bg-zinc-100 transition-colors text-sm"
          >
            프로젝트 문의하기
          </button>
          <button
            onClick={() => document.querySelector('#works')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3.5 rounded-full border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors text-sm"
          >
            포트폴리오 보기
          </button>
        </div>
      </motion.div>

      {/* 스크롤 인디케이터 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-zinc-600 to-transparent"
        />
      </motion.div>
    </section>
  )
}
