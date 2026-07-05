import AnimateOnScroll from '@/components/ui/AnimateOnScroll'

const services = [
  {
    icon: '◻',
    title: '웹사이트 제작',
    desc: '기업 소개부터 포트폴리오까지. 브랜드 아이덴티티를 담은 맞춤 웹사이트를 제작합니다.',
  },
  {
    icon: '▲',
    title: '랜딩페이지',
    desc: '전환율에 집중한 단일 페이지. 방문자가 행동하게 만드는 구조로 설계합니다.',
  },
  {
    icon: '●',
    title: '쇼핑몰',
    desc: '상품 관리부터 결제까지. 소규모 브랜드에 최적화된 쇼핑몰을 구축합니다.',
  },
]

export default function Services() {
  return (
    <section id="services" className="py-32 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="text-zinc-600 text-sm tracking-widest uppercase mb-4">Services</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 leading-tight">
            무엇이든<br />만들어 드립니다.
          </h2>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <AnimateOnScroll key={s.title} delay={i * 0.1}>
              <div className="group rounded-2xl border border-zinc-800 p-8 hover:border-zinc-600 transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.04)] h-full">
                <span className="text-2xl text-zinc-500 mb-6 block">{s.icon}</span>
                <h3 className="text-white font-semibold text-xl mb-3">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
