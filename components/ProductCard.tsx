import React, { useEffect } from "react";
import { Product, Language } from "../types";
import { TRANSLATIONS } from "../constants";
import { trackEvent } from "../services/analyticsService";

interface ProductCardProps {
  product: Product;
  lang: Language;
  onAddToCart: (p: Product) => void;
  onInquiry: (p: Product) => void;
  onPreview: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  lang,
  onAddToCart,
  onInquiry,
  onPreview,
}) => {
  const t = (key: string) => TRANSLATIONS[key][lang];

  // Track product view when card appears
  useEffect(() => {
    trackEvent("product_view", product.id);
  }, [product.id]);

  const handleAddToCart = () => {
    trackEvent("add_to_cart", product.id);
    onAddToCart(product);
  };

  const handlePreview = () => {
    trackEvent("product_click", product.id);
    onPreview(product);
  };

  return (
    <div className="group relative glass rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:neon-glow-purple border-white/5 hover:border-purple-500/50">
      <div
        className="aspect-[4/3] overflow-hidden relative cursor-pointer bg-black/40"
        onClick={handlePreview}
      >
        <img
          src={product.image}
          alt={product.name[lang]}
          className={`w-full h-full object-contain transition-transform duration-700 group-hover:scale-105 p-2 ${product.comingSoon ? 'opacity-70' : ''}`}
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="glass px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest border-white/20 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500">
            {t("btn_preview")}
          </div>
        </div>
        {product.comingSoon && (
          <div className="absolute top-4 left-4 px-3 py-1.5 bg-yellow-500 text-black rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 z-10">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {lang === 'pl' ? 'Wkrótce' : lang === 'nl' ? 'Binnenkort' : 'Coming Soon'}
          </div>
        )}
        <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-pink-400 border border-pink-500/30">
          {product.category}
        </div>
      </div>

      <div className="p-4 md:p-6">
        <h3
          className="text-base md:text-xl font-bold font-display mb-1 cursor-pointer hover:text-pink-500 transition-colors line-clamp-2"
          onClick={handlePreview}
        >
          {product.name[lang]}
        </h3>

        {product.address && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold mb-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="truncate">{product.address}</span>
          </div>
        )}

        <p className="text-gray-400 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2 font-light">
          {product.description[lang]}
        </p>

        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="flex flex-col">
            {product.customPriceText ? (
              <span className="text-base md:text-lg font-bold text-pink-400">
                {product.customPriceText[lang]}
              </span>
            ) : (
              <>
                {product.originalPrice && (
                  <span className="text-[10px] md:text-xs text-gray-500">
                    €{product.originalPrice.toFixed(2)}{" "}
                    <span className="text-[9px] md:text-[10px]">
                      {lang === "pl"
                        ? "netto (bez BTW)"
                        : lang === "nl"
                        ? "excl. BTW"
                        : "excl. VAT"}
                    </span>
                  </span>
                )}
                <span className="text-xl md:text-2xl font-black gradient-text">
                  €{product.price.toFixed(2)}
                </span>
                <span className="text-[9px] md:text-[10px] text-gray-500">
                  {lang === "pl"
                    ? "brutto (z BTW 21%)"
                    : lang === "nl"
                    ? "incl. 21% BTW"
                    : "incl. 21% VAT"}
                </span>
              </>
            )}
          </div>
          {!product.customPriceText && (
            <span className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-widest self-end pb-1">
              {t("price_per_day")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {product.comingSoon ? (
            <div className="col-span-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 text-yellow-400 p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-xs flex items-center justify-center gap-2 cursor-not-allowed">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lang === 'pl' ? 'Wkrótce dostępne' : lang === 'nl' ? 'Binnenkort beschikbaar' : 'Coming Soon'}
            </div>
          ) : product.contactLink ? (
            <a
              href={product.contactLink}
              target="_blank"
              rel="noopener noreferrer"
              className="col-span-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-xs hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              {lang === "pl"
                ? "Skontaktuj się z artystą"
                : lang === "nl"
                ? "Contact met artiest"
                : "Contact artist"}
            </a>
          ) : (
            <>
              <button
                onClick={handleAddToCart}
                className="bg-white text-black p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-xs hover:bg-pink-500 hover:text-white transition-all duration-300"
              >
                {t("btn_add_to_cart")}
              </button>
              <button
                onClick={() => onInquiry(product)}
                className="glass p-2.5 md:p-3 rounded-xl font-bold text-[10px] md:text-xs hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {t("btn_ask_question")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
