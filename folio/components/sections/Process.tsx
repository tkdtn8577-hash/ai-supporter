import AnimateOnScroll from '@/components/ui/AnimateOnScroll'

const steps = [
  { num: '01', title: '상담', desc: '요구사항 파악 및 방향성 정의' },
  { num: '02', title: '기획/디자인', desc: '와이어프레임 + 디자인 시안 확정' },
  { num: '03', title: '개발', desc: '반응형 퍼블리싱 및 기능 구현' },
  { num: '04', title: '납품', desc: '검수 후 도메인 연결 및 오픈' },
  { num: '05', title: '유지보수', desc: '오픈 후 수정 사항 대응' },
]

export default function Process() {
  return (
    <section id="process" className="py-32 px-6 bg-black">
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <p className="text-zinc-600 text-sm tracking-widest uppercase mb-4">Process</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 leading-tight">
            이렇게<br />진행됩니다.
          </h2>
        </AnimateOnScroll>

        {/* 데스크탑: 수평 타임라인 */}
        <div className="hidden md:grid grid-cols-5 gap-0">
          {steps.map((step, i) => (
            <AnimateOnScroll key={step.num} delay={i * 0.1}>
              <div className="relative pr-4">
                {/* 연결선 */}
                {i < steps.length - 1 && (
                  <div className="absolute top-5 left-[3.25rem] right-0 h-px bg-zinc-800 z-0" />
                )}
                <div className="relative z-10 flex flex-col gap-4">
                  <div className="w-10 h-10 rounded-full border border-zinc-700 bg-black flex items-center justify-center text-xs text-zinc-500 font-mono">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-white font-semibold mb-1">{step.title}</p>
                    <p className="text-zinc-600 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>

        {/* 모바일: 수직 타임라인 */}
        <div className="md:hidden flex flex-col gap-0">
          {steps.map((step, i) => (
            <AnimateOnScroll key={step.num} delay={i * 0.1}>
              <div className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full border border-zinc-700 bg-black flex items-center justify-center text-xs text-zinc-500 font-mono shrink-0">
                    {step.num}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-zinc-800 my-2" />}
                </div>
                <div className="pb-8">
                  <p className="text-white font-semibold mb-1 mt-1.5">{step.title}</p>
                  <p className="text-zinc-600 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  )
}
