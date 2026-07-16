import Navbar from './components/Navbar/Navbar';
import Hero from './components/Hero/Hero';
import FAQ from './components/FAQ/FAQ';
import About from './components/About/About';
import Certificate from './components/Certificate/Certificate';
import Skills from './components/Skills/Skills';
import Projects from './components/Projects/Projects';
import Experience from './components/Experience/Experience';
import Contact from './components/Contact/Contact';
import Footer from './components/Footer/Footer';
import ThreeBackground from './components/ThreeBackground/ThreeBackground';

function App() {
  return (
    <>
      <ThreeBackground />
      <Navbar />
      <main>
        <Hero />
        <FAQ />
        <Projects />
        <About />
        <Certificate />
        <Skills />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

export default App;