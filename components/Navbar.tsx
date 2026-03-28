import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Language, Translation } from "../types";
import LanguageSwitcher from "./LanguageSwitcher";
import { TRANSLATIONS } from "../constants";

interface NavbarProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  cartCount: number;
  onOpenCart: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  lang,
  onLangChange,
  cartCount,
  onOpenCart,
}) => {
  const t = (key: string) => TRANSLATIONS[key][lang];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link
            to="/"
            className="text-lg md:text-2xl font-black font-display tracking-tighter"
            onClick={closeMobileMenu}
          >
            <span className="gradient-text">Party Accessoires</span>{" "}
            <span className="text-white">Verhuur</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className="text-sm font-medium hover:text-pink-500 transition-colors"
            >
              {t("nav_home")}
            </Link>
            <Link
              to="/products"
              className="text-sm font-medium hover:text-pink-500 transition-colors"
            >
              {t("nav_products")}
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium hover:text-pink-500 transition-colors"
            >
              {t("nav_about")}
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium hover:text-pink-500 transition-colors"
            >
              {t("nav_contact")}
            </Link>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <LanguageSwitcher current={lang} onChange={onLangChange} />
            <button
              onClick={onOpenCart}
              className="relative p-2 rounded-full glass hover:bg-white/10 transition-all"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 md:h-6 md:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full glass hover:bg-white/10 transition-all"
              aria-label="Menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeMobileMenu}
      />

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 glass border-t border-white/10 transition-all duration-300 md:hidden ${
          mobileMenuOpen
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
      >
        <div className="flex flex-col p-6 space-y-1">
          <Link
            to="/"
            onClick={closeMobileMenu}
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-colors text-lg font-bold"
          >
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            {t("nav_home")}
          </Link>
          <Link
            to="/products"
            onClick={closeMobileMenu}
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-colors text-lg font-bold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-purple-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            {t("nav_products")}
          </Link>
          <Link
            to="/about"
            onClick={closeMobileMenu}
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-colors text-lg font-bold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t("nav_about")}
          </Link>
          <Link
            to="/contact"
            onClick={closeMobileMenu}
            className="flex items-center gap-3 p-4 rounded-2xl hover:bg-white/10 transition-colors text-lg font-bold"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-cyan-500"
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
            {t("nav_contact")}
          </Link>
        </div>
      </div>
    </>
  );
};

export default Navbar;
