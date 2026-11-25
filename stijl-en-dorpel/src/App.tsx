import { usePackVersion } from './packs';
import { lazy, Suspense } from 'react';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { QuoteProvider } from './quote';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Shop from './pages/Shop';
import Services from './pages/Services';
import Measure from './pages/Measure';
import About from './pages/About';
import Contact from './pages/Contact';
import QuoteList from './pages/QuoteList';
import NotFound from './pages/NotFound';

// Preview builds (VITE_PREVIEW=1) run inside a sandboxed frame without real URLs.
const Router = import.meta.env.VITE_PREVIEW ? MemoryRouter : BrowserRouter;

const Configurator = lazy(() => import('./pages/Configurator'));
const Legal = lazy(() => import('./pages/Legal'));
const Product = lazy(() => import('./pages/Product'));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function App() {
  usePackVersion();
  return (
    <LanguageProvider>
      <QuoteProvider>
        <Router>
          <Layout>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/deuren" element={<Shop />} />
                <Route path="/producten" element={<Shop />} />
                <Route path="/product/:id" element={<Product />} />
                <Route path="/configurator" element={<Configurator />} />
                <Route path="/diensten" element={<Services />} />
                <Route path="/inmeten" element={<Measure />} />
                <Route path="/over-ons" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/offertelijst" element={<QuoteList />} />
                <Route path="/privacy" element={<Legal page="privacy" />} />
                <Route path="/voorwaarden" element={<Legal page="terms" />} />
                <Route path="/cookies" element={<Legal page="cookies" />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </QuoteProvider>
    </LanguageProvider>
  );
}
