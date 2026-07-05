'use client'

import AnimateOnScroll from '@/components/ui/AnimateOnScroll'

const plans = [
  {
    name: '랜딩페이지',
    price: '150만원~',
    features: ['단일 페이지', '반응형 디자인', '문의 폼 연동', '도메인 연결'],
  },
  {
    name: '웹사이트',
    price: '300만원~',
    features: ['멀티 페이지', '반응형 디자인', '콘텐츠 관리', '도메인 연결', 'SEO 기본 설정'],
    highlight: true,
  },
  {
    name: '쇼핑몰',
    price: '500만원~',
    features: ['상품 관리', '결제 시스템', '주문 관리', '반응형 디자인', '도메인 연결'],
  },
]

export default function Pricing() {
  function scrollToContact() {
    document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="pricing" className="py-32 px-6 bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="text-zinc-600 text-sm tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            합리적인<br />가격으로
          </h2>
          <p className="text-zinc-500 mb-16">요구사항에 따라 변동될 수 있습니다. 문의 시 정확한 견적을 제공합니다.</p>
        </AnimateOnScroll>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <AnimateOnScroll key={plan.name} delay={i * 0.1}>
              <div className={`rounded-2xl p-8 h-full flex flex-col ${
                plan.highlight
                  ? 'bg-white text-black'
                  : 'border border-zinc-800 bg-black text-white'
              }`}>
                <p className={`text-sm font-medium mb-2 ${plan.highlight ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {plan.name}
                </p>
                <p className={`text-4xl font-bold mb-8 ${plan.highlight ? 'text-black' : 'text-white'}`}>
                  {plan.price}
                </p>
                <ul className="space-y-2.5 flex-1 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className={`text-sm flex items-center gap-2 ${plan.highlight ? 'text-zinc-700' : 'text-zinc-500'}`}>
                      <span className={plan.highlight ? 'text-black' : 'text-zinc-600'}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={scrollToContact}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors ${
                    plan.highlight
                      ? 'bg-black text-white hover:bg-zinc-800'
                      : 'border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  견적 문의하기
                </button>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
