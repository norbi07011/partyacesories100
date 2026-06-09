import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Products from "./pages/Products";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Admin from "./pages/Admin";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCancel from "./pages/PaymentCancel";
import CartDrawer from "./components/CartDrawer";
import ScrollProgress from "./components/ScrollProgress";
import InquiryModal from "./components/InquiryModal";
import SizeSelectionModal from "./components/SizeSelectionModal";
import LetterSelectionModal from "./components/LetterSelectionModal";
import { Language, Product, CartItem } from "./types";
import { TRANSLATIONS } from "./constants";

// Products that require size selection before adding to cart
const PRODUCTS_WITH_SIZE_OPTIONS = ["037284ec-f37c-4772-86a0-86e014430842"];

// Products that require letter selection (charged per letter)
const PRODUCTS_WITH_LETTER_OPTIONS = ["dcb01f77-9a19-4bd0-b147-dd8eed199766"];

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>("nl");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [inquiryProduct, setInquiryProduct] = useState<Product | null>(null);
  const [sizeSelectionProduct, setSizeSelectionProduct] =
    useState<Product | null>(null);
  const [letterSelectionProduct, setLetterSelectionProduct] =
    useState<Product | null>(null);

  // Initialize language from browser if possible
  useEffect(() => {
    const browserLang = navigator.language.split("-")[0];
    if (browserLang === "pl" || browserLang === "nl" || browserLang === "en") {
      setLang(browserLang as Language);
    }
  }, []);

  const addToCart = (product: Product, selectedSize?: string, selectedLetters?: string, letterQuantity?: number) => {
    // Check if product requires letter selection
    if (PRODUCTS_WITH_LETTER_OPTIONS.includes(product.id) && !selectedLetters) {
      setLetterSelectionProduct(product);
      return;
    }
    
    // Check if product requires size selection
    if (PRODUCTS_WITH_SIZE_OPTIONS.includes(product.id) && !selectedSize) {
      setSizeSelectionProduct(product);
      return;
    }

    setCart((prev) => {
      // For products with letters, each letter combination is unique
      if (selectedLetters && letterQuantity) {
        return [...prev, { 
          product, 
          quantity: letterQuantity, 
          selectedLetters 
        }];
      }
      
      // For products with sizes, match both product ID and size
      const existing = prev.find(
        (item) =>
          item.product.id === product.id && item.selectedSize === selectedSize
      );
      // If product already in cart, don't add again (max 1 per product)
      if (existing) {
        return prev;
      }
      return [...prev, { product, quantity: 1, selectedSize }];
    });
    setIsCartOpen(true);
  };

  const handleAddToCartWithSize = (product: Product, size: string) => {
    setSizeSelectionProduct(null);
    addToCart(product, size);
  };

  const handleAddToCartWithLetters = (product: Product, letters: string, quantity: number) => {
    setLetterSelectionProduct(null);
    addToCart(product, undefined, letters, quantity);
  };

  const handleInquiry = (product: Product) => {
    setInquiryProduct(product);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Router>
      <div className="min-h-screen selection:bg-pink-500 selection:text-white">
        <ScrollProgress />
        <Navbar
          lang={lang}
          onLangChange={setLang}
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
        />

        <main className="pb-20">
          <Routes>
            <Route path="/" element={<Home lang={lang} />} />
            <Route
              path="/products"
              element={
                <Products
                  lang={lang}
                  onAddToCart={addToCart}
                  onInquiry={handleInquiry}
                />
              }
            />
            <Route path="/about" element={<About lang={lang} />} />
            <Route path="/contact" element={<Contact lang={lang} />} />
            <Route path="/admin" element={<Admin lang={lang} />} />
            <Route path="/success" element={<PaymentSuccess lang={lang} />} />
            <Route path="/cancel" element={<PaymentCancel lang={lang} />} />
          </Routes>
        </main>

        <footer className="py-6 md:py-10 glass border-t border-white/10 mt-auto">
          <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <p className="text-xs md:text-sm text-gray-500 text-center md:text-left">
              © {new Date().getFullYear()} Party Accessoires Verhuur.{" "}
              {TRANSLATIONS.footer_rights[lang]}
            </p>
            <div className="flex gap-4 md:gap-6 items-center flex-wrap justify-center">
              <Link
                to="/admin"
                className="text-gray-400 hover:text-white transition-colors text-[10px] md:text-xs font-black uppercase tracking-widest border border-white/10 px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-white/5"
              >
                {TRANSLATIONS.nav_admin[lang]}
              </Link>
              <a
                href="https://www.facebook.com/share/1HYMSLhPc1/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-blue-500 transition-colors text-[10px] md:text-xs font-bold flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
              <a
                href="https://www.tiktok.com/@partijwestland?_r=1&_t=ZG-92paW6LPL4C"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-pink-500 transition-colors text-[10px] md:text-xs font-bold flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                </svg>
                TikTok
              </a>
            </div>
          </div>
        </footer>

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          lang={lang}
          onClearCart={() => setCart([])}
        />

        <InquiryModal
          product={inquiryProduct}
          lang={lang}
          onClose={() => setInquiryProduct(null)}
        />

        <SizeSelectionModal
          product={sizeSelectionProduct}
          lang={lang}
          onClose={() => setSizeSelectionProduct(null)}
          onConfirm={handleAddToCartWithSize}
        />

        <LetterSelectionModal
          product={letterSelectionProduct}
          lang={lang}
          onClose={() => setLetterSelectionProduct(null)}
          onConfirm={handleAddToCartWithLetters}
        />
      </div>
    </Router>
  );
};

export default App;
