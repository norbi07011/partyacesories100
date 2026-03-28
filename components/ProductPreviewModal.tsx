import React, { useState, useEffect } from "react";
import { Product, Language } from "../types";
import { TRANSLATIONS } from "../constants";
import { fetchBookedDatesForProduct } from "../services/bookingService";

interface ProductPreviewModalProps {
  product: Product | null;
  lang: Language;
  onClose: () => void;
  onAddToCart: (p: Product) => void;
  onInquiry: (p: Product) => void;
}

const ProductPreviewModal: React.FC<ProductPreviewModalProps> = ({
  product,
  lang,
  onClose,
  onAddToCart,
  onInquiry,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (product) {
      loadBookedDates();
    }
  }, [product]);

  const loadBookedDates = async () => {
    if (!product) return;
    setLoadingDates(true);
    try {
      const dates = await fetchBookedDatesForProduct(product.id);
      setBookedDates(dates);
    } catch (error) {
      console.error("Error loading booked dates:", error);
    } finally {
      setLoadingDates(false);
    }
  };

  if (!product) return null;

  const t = (key: string) => TRANSLATIONS[key][lang];
  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.image];
  const hasMultipleImages = images.length > 1;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute inset-0 cursor-pointer" onClick={onClose}></div>

      <div className="relative glass w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(168,85,247,0.2)] border-purple-500/20 flex flex-col md:flex-row animate-in zoom-in-95 duration-500">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 p-3 glass hover:bg-white/10 rounded-full transition-all group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Product Image Section with Gallery */}
        <div className="w-full md:w-1/2 h-[300px] md:h-auto relative bg-black/40 flex flex-col">
          <div className="flex-1 flex items-center justify-center relative">
            <img
              src={images[currentImageIndex]}
              alt={product.name[lang]}
              className="w-full h-full object-contain p-4"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 md:from-transparent to-transparent pointer-events-none"></div>
            <div className="absolute top-6 left-6 px-4 py-2 glass bg-black/50 rounded-full text-xs font-black tracking-widest uppercase border-pink-500/30 text-pink-400">
              {product.category}
            </div>

            {hasMultipleImages && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? images.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 glass hover:bg-white/20 rounded-full transition-all z-10"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === images.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 glass hover:bg-white/20 rounded-full transition-all z-10"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? "bg-pink-500 w-8"
                          : "bg-white/40 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {hasMultipleImages && (
            <div className="flex gap-2 p-4 overflow-x-auto bg-black/20 border-t border-white/10">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex
                      ? "border-pink-500 scale-105"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name[lang]} ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
          <h2 className="text-3xl md:text-5xl font-black font-display tracking-tighter mb-4 leading-tight">
            {product.name[lang]}
          </h2>

          {product.address && (
            <div className="flex items-center gap-2 text-sm text-blue-400 font-bold mb-6 p-3 glass rounded-2xl border-blue-500/20 w-fit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
              <span>{product.address}</span>
            </div>
          )}

          <div className="space-y-6 mb-10">
            <p className="text-gray-400 text-lg leading-relaxed font-light">
              {product.description[lang]}
            </p>

            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-4xl font-black gradient-text">
                  €{product.price.toFixed(2)}
                </span>
                <span className="text-sm text-gray-400 mt-1">
                  {lang === "nl"
                    ? "incl. 21% BTW"
                    : lang === "en"
                    ? "incl. 21% VAT"
                    : "brutto (z 21% VAT)"}
                </span>
              </div>
              <span className="text-sm text-gray-500 uppercase font-black tracking-[0.2em] self-end pb-1">
                {t("price_per_day")}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all duration-300 shadow-xl neon-glow-pink"
            >
              {t("btn_add_to_cart")}
            </button>
            <button
              onClick={() => {
                onInquiry(product);
                onClose();
              }}
              className="w-full glass border-white/10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-3"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
          </div>

          {/* Availability Calendar */}
          <div className="mt-6 p-4 glass rounded-2xl border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-pink-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {lang === "nl"
                  ? "Beschikbaarheid"
                  : lang === "en"
                  ? "Availability"
                  : "Dostępność"}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() - 1
                      )
                    )
                  }
                  className="p-1.5 glass rounded-lg hover:bg-white/10"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() =>
                    setCurrentMonth(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth() + 1
                      )
                    )
                  }
                  className="p-1.5 glass rounded-lg hover:bg-white/10"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-center text-sm font-bold mb-3">
              {currentMonth.toLocaleDateString(
                lang === "nl" ? "nl-NL" : lang === "pl" ? "pl-PL" : "en-US",
                { month: "long", year: "numeric" }
              )}
            </p>

            {loadingDates ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {(lang === "nl"
                    ? ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]
                    : lang === "pl"
                    ? ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"]
                    : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
                  ).map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-bold text-gray-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const year = currentMonth.getFullYear();
                    const month = currentMonth.getMonth();
                    const firstDay = new Date(year, month, 1);
                    const lastDay = new Date(year, month + 1, 0);
                    const startPadding = (firstDay.getDay() + 6) % 7;
                    const days = [];

                    for (let i = 0; i < startPadding; i++) {
                      days.push(<div key={`pad-${i}`} className="h-8"></div>);
                    }

                    for (let d = 1; d <= lastDay.getDate(); d++) {
                      const dateStr = `${year}-${String(month + 1).padStart(
                        2,
                        "0"
                      )}-${String(d).padStart(2, "0")}`;
                      const isBooked = bookedDates.includes(dateStr);
                      const isPast =
                        new Date(dateStr) < new Date(new Date().toDateString());
                      const isToday =
                        dateStr === new Date().toISOString().split("T")[0];

                      days.push(
                        <div
                          key={dateStr}
                          className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                            isBooked
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : isPast
                              ? "text-gray-600"
                              : isToday
                              ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                              : "bg-green-500/10 text-green-400 border border-green-500/20"
                          }`}
                          title={
                            isBooked
                              ? lang === "nl"
                                ? "Gereserveerd"
                                : lang === "pl"
                                ? "Zarezerwowane"
                                : "Reserved"
                              : lang === "nl"
                              ? "Beschikbaar"
                              : lang === "pl"
                              ? "Dostępne"
                              : "Available"
                          }
                        >
                          {d}
                        </div>
                      );
                    }

                    return days;
                  })()}
                </div>
                <div className="flex gap-4 mt-3 text-[10px] justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30"></div>
                    <span className="text-gray-400">
                      {lang === "nl"
                        ? "Beschikbaar"
                        : lang === "pl"
                        ? "Dostępne"
                        : "Available"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"></div>
                    <span className="text-gray-400">
                      {lang === "nl"
                        ? "Gereserveerd"
                        : lang === "pl"
                        ? "Zarezerwowane"
                        : "Reserved"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Special Hall Rental Offer Mention */}
          <div className="mt-8 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.334-.398-1.817a1 1 0 00-1.514-.857 7.016 7.016 0 00-3.388 5.792c0 3.866 3.135 7 7 7s7-3.134 7-7c0-2.592-1.408-4.856-3.493-6.053a1 1 0 00-1.011.033c-.563.387-.954.912-1.18 1.43-.223.51-.301 1.053-.284 1.57a3.037 3.037 0 01-.137 1.18c-.14.475-.418.9-.81 1.19a.952.952 0 01-.397.15c-.14.03-.285.01-.41-.06a.95.952 0 01-.397-.15c-.412-.345-.639-.858-.718-1.352a3.04 3.04 0 01.127-1.13c.094-.383.228-.763.402-1.13.174-.367.382-.723.633-1.074.5-.702 1.112-1.34 1.83-1.88z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {lang === "pl"
              ? "Wybierz ten produkt wraz z wynajmem sali i otrzymaj 50% zniżki!"
              : lang === "nl"
              ? "Kies dit product samen met zaalverhuur en ontvang 50% korting!"
              : "Choose this product along with hall rental and get a 50% discount!"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPreviewModal;
