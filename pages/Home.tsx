import React, { useRef, useEffect, useState } from "react";
import { Language } from "../types";
import { TRANSLATIONS, PROMO_VIDEOS } from "../constants";
import { Link } from "react-router-dom";
import {
  fetchComingSoonProducts,
  ComingSoonItem,
  migrateExpiredProducts,
} from "../services/comingSoonService";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface HomeProps {
  lang: Language;
}

/* Split text into wrapped words for hero animation */
const HeroWords: React.FC<{ text: string; baseDelay?: number }> = ({
  text,
  baseDelay = 0,
}) => {
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={i} className="hero-word-wrap">
          <span
            className="hero-word"
            style={{ animationDelay: `${baseDelay + i * 0.12}s` }}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
};

const Home: React.FC<HomeProps> = ({ lang }) => {
  const t = (key: string) => TRANSLATIONS[key][lang];
  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);

  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [currentBgImage, setCurrentBgImage] = useState(0);
  const [videoLang, setVideoLang] = useState<"pl" | "nl">("nl");
  const [comingSoonProducts, setComingSoonProducts] = useState<ComingSoonItem[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useScrollReveal();

  const currentVideos = PROMO_VIDEOS[videoLang];

  useEffect(() => {
    const loadComingSoon = async () => {
      await migrateExpiredProducts();
      const products = await fetchComingSoonProducts();
      setComingSoonProducts(products);
    };
    loadComingSoon();
  }, []);

  /* ── Parallax on hero background ── */
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (heroBgRef.current) {
        heroBgRef.current.style.transform = `translateY(${scrollY * 0.38}px)`;
      }
      if (heroContentRef.current) {
        heroContentRef.current.style.transform = `translateY(${scrollY * 0.12}px)`;
        heroContentRef.current.style.opacity = String(
          Math.max(0, 1 - scrollY / 600)
        );
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── Video carousel helpers ── */
  const goToVideo = (index: number) => {
    const newIndex = Math.max(0, Math.min(index, currentVideos.length - 1));
    setActiveVideoIndex(newIndex);
    if (playingIndex !== null && playingIndex !== newIndex) {
      const currentVideo = videoRefs.current[playingIndex];
      if (currentVideo) {
        currentVideo.pause();
        currentVideo.muted = true;
      }
      setPlayingIndex(null);
    }
  };
  const goToPrevVideo = () =>
    goToVideo(activeVideoIndex === 0 ? currentVideos.length - 1 : activeVideoIndex - 1);
  const goToNextVideo = () =>
    goToVideo(activeVideoIndex === currentVideos.length - 1 ? 0 : activeVideoIndex + 1);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNextVideo();
    if (distance < -minSwipeDistance) goToPrevVideo();
  };

  const heroBackgroundImages = [
    "/images/okladka-start.jpg",
    "/images/okladka-start1.jpg",
    "/images/okladka-start2.jpg",
    "/images/okladka-start3.jpg",
    "/images/okladka-start4.jpg",
  ];

  const handlePlayPause = (index: number) => {
    const video = videoRefs.current[index];
    if (!video) return;
    if (playingIndex === index) {
      video.pause();
      video.muted = true;
      setPlayingIndex(null);
    } else {
      videoRefs.current.forEach((v, i) => {
        if (v && i !== index) { v.pause(); v.muted = true; }
      });
      video.muted = false;
      video.play().catch(() => {
        video.muted = true;
        video.play().then(() => { video.muted = false; });
      });
      setPlayingIndex(index);
    }
  };

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || playingIndex !== null) return;
    let scrollAmount = 0;
    const autoScroll = setInterval(() => {
      if (carousel.scrollLeft >= carousel.scrollWidth - carousel.clientWidth) {
        carousel.scrollLeft = 0;
        scrollAmount = 0;
      } else {
        carousel.scrollLeft += 1;
      }
    }, 30);
    return () => clearInterval(autoScroll);
  }, [playingIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgImage((prev) => (prev + 1) % heroBackgroundImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroBackgroundImages.length]);

  return (
    <div className="pt-16 md:pt-20">

      {/* ══════════════════════════════════════════════
          HERO — parallax background + word-reveal text
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-[80vh] md:min-h-[85vh] flex items-center justify-center px-4 md:px-6 overflow-hidden bg-black">

        {/* Parallax background wrapper */}
        <div ref={heroBgRef} className="parallax-bg absolute inset-0 scale-110">
          {heroBackgroundImages.map((img, index) => (
            <img
              key={img}
              src={img}
              alt="Party background"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
              style={{ opacity: currentBgImage === index ? 1 : 0 }}
            />
          ))}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-[1]" />

        {/* Animated blobs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-pink-500/20 rounded-full blur-[120px] animate-pulse z-[2]" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px] animate-pulse delay-700 z-[2]" />

        {/* CSS-only floating particles */}
        {[
          { w: 6, h: 6, top: "20%", left: "15%", dur: "6s", del: "0s", color: "rgba(236,72,153,0.6)" },
          { w: 4, h: 4, top: "60%", left: "80%", dur: "8s", del: "1s", color: "rgba(139,92,246,0.5)" },
          { w: 8, h: 8, top: "40%", left: "70%", dur: "7s", del: "2s", color: "rgba(59,130,246,0.4)" },
          { w: 5, h: 5, top: "75%", left: "25%", dur: "9s", del: "0.5s", color: "rgba(6,182,212,0.5)" },
          { w: 3, h: 3, top: "30%", left: "50%", dur: "5s", del: "3s", color: "rgba(236,72,153,0.4)" },
        ].map((p, i) => (
          <div
            key={i}
            className="particle z-[2]"
            style={{
              width: p.w, height: p.h,
              top: p.top, left: p.left,
              background: p.color,
              animationDuration: p.dur,
              animationDelay: p.del,
            }}
          />
        ))}

        {/* 3D-like Floating Shapes */}
        <div className="absolute top-1/3 left-10 w-12 h-12 glass rounded-xl rotate-12 animate-float opacity-50 z-[2]" />
        <div className="absolute bottom-1/4 right-20 w-24 h-24 glass rounded-3xl -rotate-12 animate-float delay-500 opacity-40 z-[2]" />
        <div className="absolute top-1/4 right-1/4 w-8 h-8 glass rounded-full animate-float delay-1000 opacity-60 z-[2]" />

        {/* Hero content — subtle counter-parallax */}
        <div ref={heroContentRef} className="max-w-4xl text-center z-10 px-2">
          <h1 className="text-4xl sm:text-5xl md:text-8xl font-black font-display tracking-tight mb-4 md:mb-6 leading-tight">
            <span className="gradient-text-flow uppercase">
              <HeroWords text={t("hero_title")} baseDelay={0.1} />
            </span>
          </h1>
          <p
            className="text-base sm:text-xl md:text-2xl text-gray-300 mb-8 md:mb-10 max-w-2xl mx-auto font-light leading-relaxed hero-word"
            style={{ animationDelay: "0.6s" }}
          >
            {t("hero_subtitle")}
          </p>
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full sm:w-auto hero-word"
            style={{ animationDelay: "0.8s" }}
          >
            <Link
              to="/products"
              className="group relative w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-white text-black rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl animate-neon-pulse text-center"
            >
              <span className="relative z-10">{t("btn_explore")}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 glass border-white/20 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-widest hover:bg-white/10 hover:border-white/40 transition-all text-center"
            >
              {t("nav_contact")}
            </Link>
          </div>
        </div>

        {/* Scroll-down indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 hero-word" style={{ animationDelay: "1.2s" }}>
          <span className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          BOOKING CTA — reveal-scale
      ══════════════════════════════════════════════ */}
      <section className="py-10 md:py-16 px-4 md:px-6 max-w-5xl mx-auto">
        <div className="reveal-scale card-tilt glass rounded-[2rem] md:rounded-[3rem] p-6 sm:p-10 md:p-16 border-pink-500/20 relative overflow-hidden">
          {/* Shimmer overlay */}
          <div className="absolute inset-0 shimmer-hover rounded-[3rem] pointer-events-none" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-500/20 to-purple-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 text-center">
            <span className="reveal text-pink-500 font-black text-xs uppercase tracking-[0.3em]">
              {lang === "pl" ? "Zarezerwuj dziś" : lang === "nl" ? "Reserveer vandaag" : "Book today"}
            </span>
            <h2 className="reveal reveal-d1 text-2xl sm:text-3xl md:text-5xl font-black font-display mt-4 mb-4 md:mb-6 tracking-tighter">
              {t("booking_title")}
            </h2>
            <p className="reveal reveal-d2 text-gray-400 text-sm md:text-lg max-w-xl mx-auto mb-6 md:mb-10">
              {lang === "pl"
                ? "Dodaj produkty do koszyka i wybierz idealną datę dla swojego wydarzenia."
                : lang === "nl"
                ? "Voeg producten toe aan uw winkelwagen en kies de perfecte datum voor uw evenement."
                : "Add products to your cart and choose the perfect date for your event."}
            </p>
            <Link
              to="/products"
              className="reveal reveal-d3 inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-lg neon-glow-pink animate-neon-pulse"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {t("btn_explore")}
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          VIDEO CAROUSEL — reveal title + section
      ══════════════════════════════════════════════ */}
      <section className="py-12 md:py-24 relative overflow-hidden bg-gradient-to-b from-transparent via-purple-900/10 to-transparent">
        <div className="max-w-7xl mx-auto px-4 md:px-6 mb-8 md:mb-16 relative z-10">
          {/* Animated accent line */}
          <div className="flex justify-center mb-4">
            <div className="line-reveal h-[2px] w-24 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 rounded-full" />
          </div>

          <h2 className="reveal text-3xl sm:text-4xl md:text-6xl font-black font-display mb-3 md:mb-4 text-center tracking-tighter">
            {t("video_section_title")}
          </h2>
          <p className="reveal reveal-d1 text-gray-400 text-center max-w-xl mx-auto text-sm md:text-lg mb-6">
            {t("video_section_subtitle")}
          </p>

          {/* Language Toggle */}
          <div className="reveal reveal-d2 flex justify-center gap-2">
            <button
              onClick={() => { setVideoLang("nl"); setPlayingIndex(null); videoRefs.current = []; }}
              className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                videoLang === "nl"
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30 scale-105"
                  : "glass border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-lg">🇳🇱</span>
              Nederlands
            </button>
            <button
              onClick={() => { setVideoLang("pl"); setPlayingIndex(null); videoRefs.current = []; }}
              className={`px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                videoLang === "pl"
                  ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30 scale-105"
                  : "glass border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="text-lg">🇵🇱</span>
              Polski
            </button>
          </div>
        </div>

        {/* Magic Carousel */}
        <div
          className="reveal relative w-full"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative flex items-center justify-center min-h-[400px] md:min-h-[600px]">
            {currentVideos.map((video, index) => {
              const isActive = activeVideoIndex === index;
              const isPrev = index === (activeVideoIndex === 0 ? currentVideos.length - 1 : activeVideoIndex - 1);
              const isNext = index === (activeVideoIndex === currentVideos.length - 1 ? 0 : activeVideoIndex + 1);
              const isVisible = isActive || isPrev || isNext;
              if (!isVisible) return null;

              let position = 0;
              if (isPrev) position = -1;
              if (isNext) position = 1;

              return (
                <div
                  key={`${videoLang}-${video.id}`}
                  className="absolute transition-all duration-500 ease-out cursor-pointer"
                  style={{
                    transform: `translateX(${position * 110}%) scale(${isActive ? 1 : 0.7})`,
                    opacity: isActive ? 1 : 0.5,
                    filter: isActive ? "none" : "brightness(0.6) blur(1px)",
                    zIndex: isActive ? 20 : 10,
                  }}
                  onClick={() => (!isActive ? goToVideo(index) : handlePlayPause(index))}
                >
                  <div className={`relative ${video.isVertical ? "w-[200px] sm:w-[260px] md:w-[320px]" : "w-[300px] sm:w-[400px] md:w-[550px]"}`}>
                    {isActive && (
                      <div className="absolute -inset-6 md:-inset-10 rounded-[2rem] blur-2xl md:blur-3xl bg-gradient-to-br from-pink-500/50 via-purple-600/30 to-cyan-500/20 animate-pulse" />
                    )}
                    {isActive && (
                      <div
                        className="absolute -inset-1 rounded-2xl md:rounded-3xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"
                        style={{ backgroundSize: "200% 200%", animation: "gradient-shift 3s ease infinite" }}
                      />
                    )}
                    <div className={`relative rounded-xl md:rounded-2xl overflow-hidden border-2 transition-all duration-300 ${isActive ? "border-white/30 shadow-2xl" : "border-white/10"}`}>
                      <video
                        ref={(el) => (videoRefs.current[index] = el)}
                        loop playsInline
                        muted={playingIndex !== index}
                        preload="metadata"
                        className={`w-full object-cover bg-black ${video.isVertical ? "aspect-[9/16]" : "aspect-video"}`}
                      >
                        <source src={video.url} type="video/mp4" />
                      </video>
                      <div className={`absolute inset-0 flex items-center justify-center ${isActive && playingIndex === index ? "opacity-0 hover:opacity-100" : "opacity-100"} transition-opacity duration-300`}>
                        <div className={`rounded-full flex items-center justify-center ${isActive ? "w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-md" : "w-12 h-12 md:w-14 md:h-14 bg-black/40"}`}>
                          {playingIndex === index ? (
                            <svg className="h-8 w-8 md:h-10 md:w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                            </svg>
                          ) : (
                            <svg className="h-6 w-6 md:h-8 md:w-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 md:p-6 transition-all duration-300 ${isActive ? "opacity-100" : "opacity-60"}`}>
                        <span className="text-pink-400 font-bold uppercase tracking-wider text-[10px] md:text-xs mb-1 block">
                          Party Accessoires
                        </span>
                        <h3 className={`font-black font-display leading-tight ${isActive ? "text-base md:text-xl text-white" : "text-sm md:text-base text-white/70"}`}>
                          {video.title[lang]}
                        </h3>
                        {isActive && playingIndex === index && (
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex gap-0.5 items-end">
                              <span className="w-1 h-3 bg-pink-500 rounded-full animate-pulse" />
                              <span className="w-1 h-5 bg-purple-500 rounded-full animate-pulse" />
                              <span className="w-1 h-2 bg-cyan-500 rounded-full animate-pulse" />
                            </div>
                            <span className="text-xs text-white/80">
                              🔊 {lang === "pl" ? "Z dźwiękiem" : lang === "nl" ? "Met geluid" : "With sound"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Left Arrow */}
          <button
            onClick={goToPrevVideo}
            className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:border-pink-500/50 hover:bg-black/70 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center justify-center transition-all duration-300"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            onClick={goToNextVideo}
            className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 z-30 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 hover:border-pink-500/50 hover:bg-black/70 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] flex items-center justify-center transition-all duration-300"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Navigation Dots */}
          <div className="flex justify-center gap-3 mt-8">
            {currentVideos.map((_, index) => (
              <button
                key={index}
                onClick={() => goToVideo(index)}
                className={`transition-all duration-300 rounded-full ${
                  activeVideoIndex === index
                    ? "w-10 h-3 bg-gradient-to-r from-pink-500 to-purple-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]"
                    : "w-3 h-3 bg-white/30 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Background Blobs */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[150px] -z-10" />
      </section>

      {/* ══════════════════════════════════════════════
          COMING SOON — stagger cards
      ══════════════════════════════════════════════ */}
      {comingSoonProducts.length > 0 && (
        <section className="py-12 md:py-24 px-4 md:px-6 relative overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10 md:mb-16">
              <span className="reveal clip-reveal-text text-yellow-400 font-black text-xs uppercase tracking-[0.3em] mb-4 block">
                {lang === "pl" ? "Wkrótce dostępne" : lang === "nl" ? "Binnenkort beschikbaar" : "Coming Soon"}
              </span>
              {/* Animated accent line */}
              <div className="flex justify-center mb-4">
                <div className="line-reveal h-[2px] w-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full" />
              </div>
              <h2 className="reveal text-3xl sm:text-4xl md:text-6xl font-black font-display tracking-tighter">
                {lang === "pl" ? "Nowości w ofercie" : lang === "nl" ? "Nieuw in ons assortiment" : "New in our offer"}
              </h2>
              <p className="reveal reveal-d1 text-gray-400 mt-4 max-w-2xl mx-auto">
                {lang === "pl"
                  ? "Zobacz co przygotowaliśmy dla Ciebie! Te produkty będą wkrótce dostępne do wynajmu."
                  : lang === "nl"
                  ? "Bekijk wat we voor je hebben voorbereid! Deze producten zijn binnenkort beschikbaar voor verhuur."
                  : "See what we've prepared for you! These products will be available for rent soon."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {comingSoonProducts.map((product, idx) => {
                const staggerClass = `reveal-d${Math.min(idx + 1, 6)}`;
                const daysUntil = Math.ceil(
                  (new Date(product.availableFrom).getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return (
                  <div
                    key={product.id}
                    className={`reveal-scale ${staggerClass} card-tilt group glass rounded-[2rem] overflow-hidden border-yellow-500/20 hover:border-yellow-500/50 transition-all duration-500`}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-purple-900/50 to-blue-900/50">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name[lang]}
                          className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                          <svg className="w-16 h-16 text-yellow-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-4 right-4 px-3 py-1.5 bg-yellow-500 text-black rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {daysUntil}{" "}{lang === "pl" ? "dni" : lang === "nl" ? "dagen" : "days"}
                      </div>
                      <div className="absolute top-4 left-4 px-3 py-1.5 glass rounded-full text-xs font-bold uppercase tracking-wider">
                        {product.category}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl md:text-2xl font-black font-display mb-2 tracking-tight">
                        {product.name[lang]}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {product.description[lang]}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-black gradient-text">
                          €{product.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {lang === "pl" ? "Dostępne od" : lang === "nl" ? "Beschikbaar vanaf" : "Available from"}:
                          <br />
                          <span className="text-yellow-400 font-bold">
                            {new Date(product.availableFrom).toLocaleDateString(
                              lang === "pl" ? "pl-PL" : lang === "nl" ? "nl-NL" : "en-US",
                              { day: "numeric", month: "short", year: "numeric" }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Background decorations */}
          <div className="absolute top-1/4 -left-32 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px]" />
        </section>
      )}

      {/* ══════════════════════════════════════════════
          SUBSIDY CARDS — reveal-left + reveal-right
      ══════════════════════════════════════════════ */}
      <section className="py-12 md:py-20 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <div className="line-reveal h-[2px] w-20 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          {[
            {
              color: "pink",
              titleKey: "subsidy_denhaag_title",
              descKey: "subsidy_denhaag_desc",
              url: "https://www.denhaag.nl/nl/subsidies/subsidie-haags-vieren-in-de-wijk-aanvragen/",
              image: "/images/dofinansowanie-den-haag.png",
              revealClass: "reveal-left",
            },
            {
              color: "blue",
              titleKey: "subsidy_westland_title",
              descKey: "subsidy_westland_desc",
              url: "https://subsidies.gemeentewestland.nl/",
              image: "/images/dofinansowanie-wesland.png",
              revealClass: "reveal-right",
            },
          ].map((subsidy, idx) => (
            <a
              key={idx}
              href={subsidy.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${subsidy.revealClass} card-tilt group glass p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border-white/5 hover:border-${subsidy.color}-500/50 transition-all duration-700 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] cursor-pointer`}
            >
              <div className="w-full h-24 md:h-32 bg-white rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-10 group-hover:scale-105 transition-transform duration-700 overflow-hidden p-4 md:p-6">
                <img src={subsidy.image} alt={t(subsidy.titleKey)} className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl md:text-3xl font-black font-display mb-3 md:mb-4 uppercase tracking-tighter">
                {t(subsidy.titleKey)}
              </h3>
              <p className="text-gray-400 font-light leading-relaxed text-sm md:text-lg mb-4">
                {t(subsidy.descKey)}
              </p>
              <div className="flex items-center gap-2 text-pink-400 group-hover:text-pink-300 transition-colors">
                <span className="text-xs md:text-sm font-bold uppercase tracking-wider">
                  {lang === "pl" ? "Więcej informacji" : lang === "nl" ? "Meer informatie" : "Learn more"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-2 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
