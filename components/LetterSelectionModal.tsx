import React, { useState } from "react";
import { Product, Language } from "../types";

interface LetterSelectionModalProps {
  product: Product | null;
  lang: Language;
  onClose: () => void;
  onConfirm: (product: Product, letters: string, quantity: number) => void;
}

const LetterSelectionModal: React.FC<LetterSelectionModalProps> = ({
  product,
  lang,
  onClose,
  onConfirm,
}) => {
  const [selectedLetters, setSelectedLetters] = useState<string>("");

  if (!product) return null;

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const specialChars = ["?", "!", "&", "❤", "★"];

  const labels = {
    title: {
      nl: "Kies je letters",
      en: "Choose your letters",
      pl: "Wybierz litery",
    },
    subtitle: {
      nl: "Selecteer letters voor je evenement (€10 per letter)",
      en: "Select letters for your event (€10 per letter)",
      pl: "Wybierz litery na swoje wydarzenie (10€ za literę)",
    },
    yourText: {
      nl: "Jouw tekst",
      en: "Your text",
      pl: "Twój tekst",
    },
    clear: {
      nl: "Wissen",
      en: "Clear",
      pl: "Wyczyść",
    },
    space: {
      nl: "Spatie",
      en: "Space",
      pl: "Spacja",
    },
    backspace: {
      nl: "Terug",
      en: "Back",
      pl: "Cofnij",
    },
    confirm: {
      nl: "Toevoegen aan winkelwagen",
      en: "Add to cart",
      pl: "Dodaj do koszyka",
    },
    cancel: { nl: "Annuleren", en: "Cancel", pl: "Anuluj" },
    total: { nl: "Totaal", en: "Total", pl: "Łącznie" },
    letters: { nl: "letters", en: "letters", pl: "liter" },
  };

  const handleLetterClick = (letter: string) => {
    setSelectedLetters((prev) => prev + letter);
  };

  const handleSpace = () => {
    setSelectedLetters((prev) => prev + " ");
  };

  const handleBackspace = () => {
    setSelectedLetters((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setSelectedLetters("");
  };

  const totalLetters = selectedLetters.replace(/\s/g, "").length;
  const totalPrice = totalLetters * product.price;

  const handleConfirm = () => {
    if (selectedLetters.trim()) {
      onConfirm(product, selectedLetters, totalLetters);
      setSelectedLetters("");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="glass w-full max-w-3xl rounded-[2.5rem] p-6 md:p-10 border-white/10 relative animate-in zoom-in-95 duration-300 my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:top-6 md:right-6 p-2 glass rounded-full hover:bg-white/10 transition-colors z-10"
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
        <div className="w-full h-32 md:h-40 rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-pink-500/20 to-blue-500/20">
          <img
            src={product.image}
            alt={product.name[lang]}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title */}
        <h3 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight mb-2 text-center">
          {labels.title[lang]}
        </h3>
        <p className="text-gray-400 text-center mb-6 text-sm md:text-base">
          {labels.subtitle[lang]}
        </p>

        {/* Selected Text Display */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-pink-400 mb-2">
            {labels.yourText[lang]}
          </label>
          <div className="glass rounded-2xl p-4 md:p-6 border border-white/10 min-h-[80px] flex items-center justify-center">
            <div className="text-2xl md:text-4xl font-black font-display tracking-wider text-center break-all">
              {selectedLetters || (
                <span className="text-gray-600 text-xl">
                  {lang === "pl" ? "Zacznij pisać..." : lang === "nl" ? "Begin met typen..." : "Start typing..."}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 px-2">
            <span className="text-sm text-gray-400">
              {totalLetters} {labels.letters[lang]}
            </span>
            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
              {labels.total[lang]}: €{totalPrice}
            </span>
          </div>
        </div>

        {/* Letter Keyboard */}
        <div className="space-y-3 mb-6">
          {/* Alphabet rows */}
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {alphabet.slice(0, 7).map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className="aspect-square glass rounded-xl border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/20 transition-all font-black text-lg md:text-xl"
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {alphabet.slice(7, 14).map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className="aspect-square glass rounded-xl border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/20 transition-all font-black text-lg md:text-xl"
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {alphabet.slice(14, 21).map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className="aspect-square glass rounded-xl border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/20 transition-all font-black text-lg md:text-xl"
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {alphabet.slice(21).map((letter) => (
              <button
                key={letter}
                onClick={() => handleLetterClick(letter)}
                className="aspect-square glass rounded-xl border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/20 transition-all font-black text-lg md:text-xl"
              >
                {letter}
              </button>
            ))}
            {/* Fill remaining with special chars */}
            {specialChars.map((char) => (
              <button
                key={char}
                onClick={() => handleLetterClick(char)}
                className="aspect-square glass rounded-xl border border-white/10 hover:border-purple-500/50 hover:bg-purple-500/20 transition-all font-black text-lg md:text-xl"
              >
                {char}
              </button>
            ))}
          </div>

          {/* Control buttons */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            <button
              onClick={handleClear}
              className="glass rounded-xl py-3 md:py-4 border border-white/10 hover:border-red-500/50 hover:bg-red-500/20 transition-all font-bold text-sm md:text-base"
            >
              {labels.clear[lang]}
            </button>
            <button
              onClick={handleSpace}
              className="glass rounded-xl py-3 md:py-4 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/20 transition-all font-bold text-sm md:text-base"
            >
              {labels.space[lang]}
            </button>
            <button
              onClick={handleBackspace}
              className="glass rounded-xl py-3 md:py-4 border border-white/10 hover:border-yellow-500/50 hover:bg-yellow-500/20 transition-all font-bold text-sm md:text-base"
            >
              {labels.backspace[lang]}
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 glass rounded-2xl font-bold uppercase tracking-wider hover:bg-white/10 transition-all"
          >
            {labels.cancel[lang]}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLetters.trim()}
            className={`flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider transition-all ${
              selectedLetters.trim()
                ? "bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/30"
                : "glass opacity-50 cursor-not-allowed"
            }`}
          >
            {labels.confirm[lang]}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LetterSelectionModal;
