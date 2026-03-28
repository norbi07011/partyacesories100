import React, { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Language } from "../types";

interface PaymentSuccessProps {
  lang: Language;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ lang }) => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // You could verify the session here with your backend if needed
    console.log("Payment successful, session ID:", sessionId);
  }, [sessionId]);

  const messages = {
    title: {
      nl: "Betaling Geslaagd!",
      en: "Payment Successful!",
      pl: "Płatność Udana!",
    },
    message: {
      nl: "Uw bestelling is bevestigd en we hebben uw betaling ontvangen. U ontvangt spoedig een bevestigingsmail.",
      en: "Your booking is confirmed and we have received your payment. You will receive a confirmation email shortly.",
      pl: "Twoja rezerwacja została potwierdzona i otrzymaliśmy Twoją płatność. Wkrótce otrzymasz e-mail z potwierdzeniem.",
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
        {/* Success Icon */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
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

        {sessionId && (
          <p className="text-sm text-gray-500 mb-10">Session ID: {sessionId}</p>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg neon-glow-pink"
        >
          {messages.home[lang]}
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccess;
