import React, { useState } from "react";
import { Product, Language } from "../types";

interface SizeSelectionModalProps {
  product: Product | null;
  lang: Language;
  onClose: () => void;
  onConfirm: (product: Product, size: string) => void;
}

const SizeSelectionModal: React.FC<SizeSelectionModalProps> = ({
  product,
  lang,
  onClose,
  onConfirm,
}) => {
  const [selectedSize, setSelectedSize] = useState<string>("");

  if (!product) return null;

  const sizes = [
    {
      value: "5m x 7m",
      label: {
        nl: "5 meter x 7 meter",
        en: "5m x 7m",
        pl: "5 metrów x 7 metrów",
      },
    },
    {
      value: "6m x 6m",
      label: {
        nl: "6 meter x 6 meter",
        en: "6m x 6m",
        pl: "6 metrów x 6 metrów",
      },
    },
  ];

  const labels = {
    title: {
      nl: "Kies tentmaat",
      en: "Choose tent size",
      pl: "Wybierz rozmiar namiotu",
    },
    subtitle: {
      nl: "Selecteer de gewenste afmetingen voor uw feesttent",
      en: "Select the desired dimensions for your party tent",
      pl: "Wybierz wymiary namiotu imprezowego",
    },
    confirm: {
      nl: "Toevoegen aan winkelwagen",
      en: "Add to cart",
      pl: "Dodaj do koszyka",
    },
    cancel: { nl: "Annuleren", en: "Cancel", pl: "Anuluj" },
  };

  const handleConfirm = () => {
    if (selectedSize) {
      onConfirm(product, selectedSize);
      setSelectedSize("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <div className="glass w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 border-white/10 relative animate-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 glass rounded-full hover:bg-white/10 transition-colors"
        >
          <svg
            className="h-5 w-5"
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

        {/* Product image */}
        <div className="w-full h-40 rounded-2xl overflow-hidden mb-6 bg-black/40">
          <img
            src={product.image}
            alt={product.name[lang]}
            className="w-full h-full object-contain p-2"
          />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black font-display uppercase tracking-tight mb-2">
          {labels.title[lang]}
        </h3>
        <p className="text-gray-400 text-sm mb-6">{labels.subtitle[lang]}</p>

        {/* Size options */}
        <div className="space-y-3 mb-8">
          {sizes.map((size) => (
            <button
              key={size.value}
              onClick={() => setSelectedSize(size.value)}
              className={`w-full p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between ${
                selectedSize === size.value
                  ? "bg-pink-500/20 border-pink-500 text-white shadow-lg shadow-pink-500/20"
                  : "glass border-white/10 hover:border-pink-500/50 text-gray-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedSize === size.value
                      ? "border-pink-500 bg-pink-500"
                      : "border-gray-500"
                  }`}
                >
                  {selectedSize === size.value && (
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-lg font-bold">{size.label[lang]}</span>
              </div>
              <svg
                className="h-6 w-6 text-pink-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onClose}
            className="p-4 glass rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            {labels.cancel[lang]}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSize}
            className={`p-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all ${
              selectedSize
                ? "bg-pink-500 text-white hover:bg-pink-600 neon-glow-pink"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            {labels.confirm[lang]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizeSelectionModal;
