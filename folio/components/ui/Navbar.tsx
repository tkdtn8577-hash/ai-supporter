'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const links = [
  { label: 'Services', href: '#services' },
  { label: 'Works', href: '#works' },
  { label: 'Process', href: '#process' },
  { label: 'Contact', href: '#contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleNav(href: string) {
    setMenuOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled ? 'bg-black/80 backdrop-blur-md border-b border-zinc-800/50' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-white font-semibold tracking-tight">FOLIO</span>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map(l => (
              <button
                key={l.href}
                onClick={() => handleNav(l.href)}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => handleNav('#contact')}
              className="ml-2 px-4 py-1.5 rounded-full bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              문의하기
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-zinc-400 hover:text-white"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="메뉴"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              {menuOpen
                ? <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                : <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              }
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black flex flex-col items-center justify-center gap-8 md:hidden"
          >
            {links.map(l => (
              <button
                key={l.href}
                onClick={() => handleNav(l.href)}
                className="text-white text-2xl font-medium"
              >
                {l.label}
              </button>
            ))}
            <button
              onClick={() => handleNav('#contact')}
              className="mt-4 px-8 py-3 rounded-full bg-white text-black font-medium"
            >
              문의하기
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
