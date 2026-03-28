import React from "react";
import { Language } from "../types";
import { TRANSLATIONS } from "../constants";

interface AboutProps {
  lang: Language;
}

const About: React.FC<AboutProps> = ({ lang }) => {
  const t = (key: string) => TRANSLATIONS[key][lang];

  const teamMembers = [
    {
      name: "Norbs Service",
      description: {
        nl: "Professionele installatie en technische ondersteuning voor elk evenement.",
        en: "Professional installation and technical support for every event.",
        pl: "Profesjonalna instalacja i wsparcie techniczne na każde wydarzenie.",
      },
      image: "/images/norbs-service-druzyna.jpeg",
      links: [{ label: "visit_website", url: "https://norbsservice.nl" }],
      color: "blue",
    },
    {
      name: "Marris Gym",
      description: {
        nl: "Kracht, discipline en energie. Onze partner in lifestyle en wellness.",
        en: "Strength, discipline and energy. Our partner in lifestyle and wellness.",
        pl: "Siła, dyscyplina i energia. Nasz partner w dziedzinie lifestyle i wellness.",
      },
      image: "/images/marris-gym-druzyna.jpeg",
      links: [
        { label: "visit_website", url: "https://marrisgym.nl/" },
        {
          label: "social_facebook",
          url: "https://www.facebook.com/MarrisGymPL/?locale=pl_PL",
        },
      ],
      color: "pink",
    },
    {
      name: "Sztab WOŚP Den Haag",
      description: {
        nl: "Trots partner van de grootste liefdadigheidsinstelling voor kinderen.",
        en: "Proud partner of the largest children's charity foundation.",
        pl: "Dumny partner największej fundacji charytatywnej pomagającej dzieciom.",
      },
      image: "/images/wosp-den-haag-druzyna.png",
      links: [
        {
          label: "social_facebook",
          url: "https://www.facebook.com/SztabDenHaag/?locale=pl_PL",
        },
      ],
      color: "purple",
    },
    {
      name: "CHARAKTERNI",
      description: {
        nl: "Creatieve ontwerpers van onze unieke merkkleding. Zij geven stijl aan Party Accessoires Verhuur met passie en vakmanschap.",
        en: "Creative designers of our unique brand apparel. They bring style to Party Accessoires Verhuur with passion and craftsmanship.",
        pl: "Kreatywni projektanci naszej wyjątkowej odzieży firmowej. Nadają styl Party Accessoires Verhuur z pasją i profesjonalizmem.",
      },
      image: "/images/charakterni.png",
      links: [
        { label: "visit_website", url: "https://charakterni.pl/" },
        {
          label: "social_facebook",
          url: "https://www.facebook.com/CHARAKTERNI/",
        },
      ],
      color: "orange",
    },
  ];

  return (
    <div className="pt-20 md:pt-32 pb-12 md:pb-20">
      <div className="px-4 md:px-6 max-w-7xl mx-auto">
        {/* About Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-center mb-16 md:mb-32">
          <div>
            <h2 className="text-3xl md:text-6xl font-black font-display tracking-tight mb-4 md:mb-8">
              {t("nav_about")}{" "}
              <span className="gradient-text">{t("about_title_suffix")}</span>
            </h2>
            <div className="space-y-4 md:space-y-6 text-gray-400 font-light text-sm md:text-lg leading-relaxed">
              <p>{t("about_p1")}</p>
              <p>{t("about_p2")}</p>
              <div className="grid grid-cols-2 gap-4 md:gap-8 pt-4 md:pt-8">
                <div>
                  <h4 className="text-2xl md:text-3xl font-black text-white mb-1 md:mb-2">
                    500+
                  </h4>
                  <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-pink-500">
                    {t("about_stats_events")}
                  </p>
                </div>
                <div>
                  <h4 className="text-2xl md:text-3xl font-black text-white mb-1 md:mb-2">
                    24/7
                  </h4>
                  <p className="text-[10px] md:text-xs uppercase tracking-widest font-bold text-blue-500">
                    {t("about_stats_support")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-pink-500/20 to-purple-500/20 blur-3xl -z-10"></div>
            <div className="glass p-3 md:p-4 rounded-[30px] md:rounded-[40px] rotate-3 hover:rotate-0 transition-transform duration-500 border-white/10 overflow-hidden">
              <img
                src="/images/LOGO.jpg"
                className="rounded-[25px] md:rounded-[30px] w-full h-auto object-cover"
                alt="Party Accessoires Verhuur Logo"
              />
            </div>
            <div className="absolute -bottom-8 -left-8 glass p-6 rounded-3xl hidden md:block max-w-xs border-purple-500/30">
              <p className="text-sm italic">{t("about_quote")}</p>
              <p className="text-xs font-bold text-pink-500 mt-2 uppercase tracking-tighter">
                - Sarah J.
              </p>
            </div>
          </div>
        </div>

        {/* Brand Apparel Section */}
        <div className="mb-16 md:mb-32">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-5xl font-black font-display tracking-tight mb-3 md:mb-4">
              {lang === "nl"
                ? "Onze Merkkleding"
                : lang === "en"
                ? "Our Brand Apparel"
                : "Nasza Odzież Firmowa"}
            </h2>
            <p className="text-gray-400 text-sm md:text-lg max-w-2xl mx-auto">
              {lang === "nl"
                ? "Exclusief ontworpen door CHARAKTERNI - stijl en professionaliteit in elk detail"
                : lang === "en"
                ? "Exclusively designed by CHARAKTERNI - style and professionalism in every detail"
                : "Ekskluzywnie zaprojektowane przez CHARAKTERNI - styl i profesjonalizm w każdym detalu"}
            </p>
            <div className="h-1 md:h-1.5 w-16 md:w-24 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 mx-auto rounded-full mt-4"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {/* Hoodie Card */}
            <div className="group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 rounded-[3rem] blur-xl opacity-30 group-hover:opacity-60 transition duration-700"></div>
              <div className="relative glass rounded-[2.5rem] overflow-hidden border border-purple-500/20 group-hover:border-purple-500/50 transition-all duration-500">
                <div className="overflow-hidden bg-gradient-to-br from-gray-900 to-black p-4">
                  <img
                    src="/images/ubrania1.jpeg"
                    alt="Party Accessoires Verhuur Hoodie"
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105 rounded-2xl"
                  />
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-purple-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-purple-400">
                      Premium Collection
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black font-display mb-2">
                    {lang === "nl"
                      ? "Hoodie - Limited Edition"
                      : lang === "en"
                      ? "Hoodie - Limited Edition"
                      : "Bluza z Kapturem - Limitowana Edycja"}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {lang === "nl"
                      ? "Onze iconische hoodie met het kenmerkende 'NO RISK NO REWARD' design. Gemaakt voor comfort en stijl - perfect voor elk evenement."
                      : lang === "en"
                      ? "Our iconic hoodie featuring the signature 'NO RISK NO REWARD' design. Made for comfort and style - perfect for any event."
                      : "Nasza kultowa bluza z charakterystycznym designem 'NO RISK NO REWARD'. Stworzona z myślą o komforcie i stylu - idealna na każde wydarzenie."}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="px-3 py-1 glass rounded-full text-xs font-bold text-pink-400 border border-pink-500/30">
                      ALTIJD OP TIJD
                    </span>
                    <span className="px-3 py-1 glass rounded-full text-xs font-bold text-purple-400 border border-purple-500/30">
                      CHARAKTERNI
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* T-Shirt Card */}
            <div className="group relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600 rounded-[3rem] blur-xl opacity-30 group-hover:opacity-60 transition duration-700"></div>
              <div className="relative glass rounded-[2.5rem] overflow-hidden border border-blue-500/20 group-hover:border-blue-500/50 transition-all duration-500">
                <div className="overflow-hidden bg-gradient-to-br from-gray-900 to-black p-4">
                  <img
                    src="/images/ubrania.jpeg"
                    alt="Party Accessoires Verhuur T-Shirt"
                    className="w-full h-auto object-contain transition-transform duration-700 group-hover:scale-105 rounded-2xl"
                  />
                </div>
                <div className="p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
                      Elastic Performance
                    </span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black font-display mb-2">
                    {lang === "nl"
                      ? "Elastic T-Shirt - Sport Edition"
                      : lang === "en"
                      ? "Elastic T-Shirt - Sport Edition"
                      : "Elastyczna Koszulka - Edycja Sportowa"}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {lang === "nl"
                      ? "Lichtgewicht en ademend sportshirt met uniek splash design. Ideaal voor actieve evenementen en professionele optredens."
                      : lang === "en"
                      ? "Lightweight and breathable sport shirt with unique splash design. Ideal for active events and professional performances."
                      : "Lekka i oddychająca koszulka sportowa z unikalnym wzorem splash. Idealna na aktywne wydarzenia i profesjonalne występy."}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="px-3 py-1 glass rounded-full text-xs font-bold text-blue-400 border border-blue-500/30">
                      NO RISK NO REWARD
                    </span>
                    <span className="px-3 py-1 glass rounded-full text-xs font-bold text-purple-400 border border-purple-500/30">
                      CHARAKTERNI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Team & Partners Section */}
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-2xl md:text-5xl font-black font-display tracking-tight mb-3 md:mb-4">
            {t("team_section_title")}
          </h2>
          <div className="h-1 md:h-1.5 w-16 md:w-24 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {teamMembers.map((member, index) => (
            <div key={index} className="group relative">
              {/* 3D-like Card Container */}
              <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>

              <div className="relative glass p-5 md:p-6 rounded-[2rem] md:rounded-[2.5rem] h-full flex flex-col border-white/10 transition-all duration-500 group-hover:-translate-y-4">
                <div className="relative mb-4 md:mb-6 flex items-center justify-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden ring-4 ring-white/10 group-hover:ring-pink-500/50 transition-all duration-500 bg-gradient-to-br from-white/5 to-white/10 p-2">
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-contain rounded-full transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                </div>

                <h3 className="text-lg md:text-xl font-black font-display mb-2 tracking-tight text-center">
                  {member.name}
                </h3>

                <p className="text-gray-200 text-xs md:text-sm mb-4 md:mb-6 leading-relaxed flex-1 text-center">
                  {member.description[lang]}
                </p>

                <div className="flex flex-col gap-2 md:gap-3">
                  {member.links.map((link, lIndex) => (
                    <a
                      key={lIndex}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300 ${
                        link.label === "visit_website"
                          ? "bg-white text-black hover:bg-pink-500 hover:text-white neon-glow-pink"
                          : "glass border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {link.label === "social_facebook" && (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      )}
                      {t(link.label)}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;
