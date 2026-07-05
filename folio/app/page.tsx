import Navbar from '@/components/ui/Navbar'
import Footer from '@/components/ui/Footer'
import Hero from '@/components/sections/Hero'
import Services from '@/components/sections/Services'
import Works from '@/components/sections/Works'
import Process from '@/components/sections/Process'
import Pricing from '@/components/sections/Pricing'
import Contact from '@/components/sections/Contact'

export default function Home() {
  return (
    <main className="bg-black">
      <Navbar />
      <Hero />
      <Services />
      <Works />
      <Process />
      <Pricing />
      <Contact />
      <Footer />
    </main>
  )
}
