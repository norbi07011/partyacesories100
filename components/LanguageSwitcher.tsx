import React from "react";
import { Language } from "../types";

interface LanguageSwitcherProps {
  current: Language;
  onChange: (lang: Language) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  current,
  onChange,
}) => {
  const languages: { code: Language; label: string }[] = [
    { code: "nl", label: "🇳🇱 NL" },
    { code: "en", label: "🇺🇸 EN" },
    { code: "pl", label: "🇵🇱 PL" },
  ];

  return (
    <div className="flex gap-1 md:gap-2">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onChange(lang.code)}
          className={`px-2 md:px-3 py-1 rounded-full text-[10px] md:text-xs font-bold transition-all ${
            current === lang.code
              ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              : "glass text-gray-400 hover:text-white"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
