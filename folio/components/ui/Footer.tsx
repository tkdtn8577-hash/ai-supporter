export default function Footer() {
  return (
    <footer className="border-t border-zinc-900 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
        <div>
          <span className="text-white font-medium">FOLIO</span>
          <span className="ml-2">— 1인 웹 에이전시</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="mailto:tkdtn8577@gmail.com" className="hover:text-zinc-400 transition-colors">
            tkdtn8577@gmail.com
          </a>
          <a href="https://open.kakao.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
            카카오 오픈채팅
          </a>
        </div>
        <p>© {new Date().getFullYear()} FOLIO. All rights reserved.</p>
      </div>
    </footer>
  )
}
