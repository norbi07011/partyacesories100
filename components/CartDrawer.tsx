import React, { useState } from "react";
import { CartItem, Language } from "../types";
import { TRANSLATIONS } from "../constants";
import BookingModal from "./BookingModal";

interface CartDrawerProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onClearCart?: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  isOpen,
  onClose,
  lang,
  onClearCart,
}) => {
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;

  // Check if hall rental is in cart (identify by address containing "Mangaanstraat")
  const isHallRentalProduct = (item: CartItem) => {
    return (
      item.product.address && item.product.address.includes("Mangaanstraat")
    );
  };

  const hasHallRental = items.some((item) => isHallRentalProduct(item));

  // Calculate total with 50% discount on other items if hall is rented
  const calculateItemPrice = (item: CartItem) => {
    if (hasHallRental && !isHallRentalProduct(item)) {
      return item.product.price * item.quantity * 0.5; // 50% discount
    }
    return item.product.price * item.quantity;
  };

  const total = items.reduce((sum, item) => sum + calculateItemPrice(item), 0);

  const originalTotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalDiscount = originalTotal - total;

  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const handleBookingSuccess = () => {
    setBookingModalOpen(false);
    onClose();
    if (onClearCart) onClearCart();
  };

  return (
    <>
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        items={items}
        lang={lang}
        onSuccess={handleBookingSuccess}
      />
      <div
        className={`fixed inset-0 z-[100] transition-all duration-500 ${
          isOpen ? "visible" : "invisible"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />

        <div
          className={`absolute top-0 right-0 h-full w-full max-w-[90vw] sm:max-w-md glass border-l border-white/10 shadow-2xl transition-transform duration-500 ${
            isOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 md:p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-black font-display tracking-tight">
                {t("cart_title")}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
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
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-12 md:py-20">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-3 md:mb-4 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                    />
                  </svg>
                  <p className="text-gray-400 text-sm md:text-base">
                    {t("cart_empty")}
                  </p>
                </div>
              ) : (
                <>
                  {hasHallRental && items.length > 1 && (
                    <div className="p-3 glass rounded-xl border-green-500/30 bg-green-500/10 mb-4">
                      <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
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
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {lang === "nl"
                            ? "50% korting actief!"
                            : lang === "en"
                            ? "50% discount active!"
                            : "50% zniżki aktywne!"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {lang === "nl"
                          ? "Zaalverhuur: alle andere artikelen met 50% korting"
                          : lang === "en"
                          ? "Hall rental: all other items at 50% off"
                          : "Wynajem sali: 50% zniżki na pozostałe artykuły"}
                      </p>
                    </div>
                  )}
                  {items.map((item, idx) => {
                    const originalPrice = item.product.price * item.quantity;
                    const discountedPrice = calculateItemPrice(item);
                    const hasDiscount =
                      hasHallRental && !isHallRentalProduct(item);

                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 md:gap-4 p-2.5 md:p-3 glass rounded-xl md:rounded-2xl ${
                          hasDiscount ? "border-green-500/30" : "border-white/5"
                        }`}
                      >
                        <img
                          src={item.product.image}
                          className="w-16 h-16 md:w-20 md:h-20 object-contain rounded-lg md:rounded-xl bg-black/40 p-1"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs md:text-sm line-clamp-2">
                            {item.product.name[lang]}
                          </h4>
                          {item.selectedSize && (
                            <p className="text-[10px] md:text-xs text-pink-400 font-bold mb-1">
                              📐 {item.selectedSize}
                            </p>
                          )}
                          {item.selectedLetters && (
                            <p className="text-xs md:text-sm text-pink-400 font-black mb-1 font-display tracking-wider">
                              ✨ "{item.selectedLetters}"
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mb-2">
                            €{item.product.price.toFixed(2)} / unit
                            {hasDiscount && (
                              <span className="ml-2 text-green-400 font-bold">
                                -50%
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] md:text-xs glass px-2 py-1 rounded bg-white/5 font-mono">
                              {t("qty_label")}: {item.quantity}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {hasDiscount && (
                            <p className="text-xs text-gray-500 line-through">
                              €{originalPrice.toFixed(2)}
                            </p>
                          )}
                          <p
                            className={`font-bold text-sm md:text-base ${
                              hasDiscount ? "text-green-400" : "text-pink-500"
                            }`}
                          >
                            €{discountedPrice.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-4 md:p-6 border-t border-white/10 space-y-3 md:space-y-4">
                {totalDiscount > 0 && (
                  <div className="flex justify-between items-center text-sm text-green-400">
                    <span>
                      {lang === "nl"
                        ? "Bespaard (50% korting)"
                        : lang === "en"
                        ? "Saved (50% discount)"
                        : "Zaoszczędzone (50% zniżki)"}
                    </span>
                    <span className="font-bold">
                      -€{totalDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg md:text-xl font-bold">
                  <span>{t("total")}</span>
                  <span className="gradient-text">€{total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => setBookingModalOpen(true)}
                  className="w-full bg-white text-black py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all duration-300 shadow-xl neon-glow-blue"
                >
                  {t("checkout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;
