import React from "react";
import { Link } from "react-router-dom";
import { Language } from "../types";

interface PaymentCancelProps {
  lang: Language;
}

const PaymentCancel: React.FC<PaymentCancelProps> = ({ lang }) => {
  const messages = {
    title: {
      nl: "Betaling Geannuleerd",
      en: "Payment Cancelled",
      pl: "Płatność Anulowana",
    },
    message: {
      nl: "Uw betaling is geannuleerd. U kunt altijd terugkeren om uw bestelling af te ronden.",
      en: "Your payment has been cancelled. You can always return to complete your order.",
      pl: "Twoja płatność została anulowana. Zawsze możesz wrócić, aby dokończyć zamówienie.",
    },
    tryAgain: {
      nl: "Probeer Opnieuw",
      en: "Try Again",
      pl: "Spróbuj Ponownie",
    },
    home: {
      nl: "Terug naar Home",
      en: "Back to Home",
      pl: "Powrót do strony głównej",
    },
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 md:px-6 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center">
        {/* Cancel Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-black font-display mb-6 gradient-text">
          {messages.title[lang]}
        </h1>

        <p className="text-lg text-gray-400 mb-10 leading-relaxed">
          {messages.message[lang]}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg neon-glow-pink"
          >
            {messages.tryAgain[lang]}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-3 px-10 py-5 glass border-white/10 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            {messages.home[lang]}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
