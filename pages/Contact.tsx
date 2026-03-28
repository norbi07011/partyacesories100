import React, { useState, useEffect } from "react";
import { Language, DayOverride } from "../types";
import { TRANSLATIONS } from "../constants";
import CustomCalendar from "../components/CustomCalendar";
import { fetchBookedDates, createBooking } from "../services/bookingService";
import { fetchCalendarOverrides } from "../services/calendarService";

interface ContactProps {
  lang: Language;
}

const Contact: React.FC<ContactProps> = ({ lang }) => {
  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;
  const [selectedDate, setSelectedDate] = useState("");
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [formSent, setFormSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const [datesData, overridesData] = await Promise.all([
        fetchBookedDates(),
        fetchCalendarOverrides(),
      ]);
      setBookedDates(datesData);
      setOverrides(overridesData);
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const customerName = formData.get("name") as string;
    const customerEmail = formData.get("email") as string;

    try {
      setSubmitting(true);
      await createBooking(customerName, customerEmail, selectedDate, [], 0);
      setFormSent(true);
      // Refresh calendar data to show new booking
      await loadCalendarData();
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Error creating booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pt-20 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 max-w-7xl mx-auto">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 md:mb-16">
          <h2 className="text-3xl md:text-6xl font-black font-display tracking-tight mb-3 md:mb-4 uppercase">
            {t("nav_contact")} &{" "}
            <span className="gradient-text">{t("booking_title")}</span>
          </h2>
          <p className="text-gray-400 text-sm md:text-base">
            {t("contact_info")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-16 items-start mb-12 md:mb-20">
          {/* Calendar Section */}
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-left duration-700">
            <div className="glass p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-20 w-20 md:h-32 md:w-32"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl md:text-3xl font-black font-display mb-2 uppercase tracking-tight">
                {t("booking_select_date")}
              </h3>
              <p className="text-gray-400 mb-6 md:mb-8 font-light text-sm md:text-base">
                {lang === "nl"
                  ? "Selecteer een beschikbare datum om onze zaal of apparatuur te reserveren voor uw evenement."
                  : lang === "en"
                  ? "Select an available date to book our venue or equipment for your event."
                  : "Zaznacz wolny termin, aby zarezerwować naszą salę lub sprzęt na swoje wydarzenie."}
              </p>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <CustomCalendar
                  bookedDates={bookedDates}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                  overrides={overrides}
                  lang={lang}
                />
              )}
            </div>

            <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
              <h4 className="text-xl font-bold font-display uppercase tracking-widest">
                {t("service_area_title")}
              </h4>
              <p className="text-gray-300 text-sm">
                {lang === "nl" &&
                  "Wij bedienen Den Haag, Westland en omgeving!"}
                {lang === "en" &&
                  "We serve The Hague, Westland and surrounding areas!"}
                {lang === "pl" && "Obsługujemy Hagę, Westland i okolice!"}
              </p>
              <div className="aspect-video rounded-3xl overflow-hidden glass border-white/5 shadow-2xl relative">
                <iframe
                  title="Map"
                  src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d156500!2d4.25!3d52.05!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2snl!4v1716300000000!5m2!1sen!2snl"
                  className="w-full h-full"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <span className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-wider text-pink-400 border border-pink-500/30">
                  Den Haag
                </span>
                <span className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-wider text-blue-400 border border-blue-500/30">
                  Westland
                </span>
                <span className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-wider text-purple-400 border border-purple-500/30">
                  Delft
                </span>
                <span className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-wider text-green-400 border border-green-500/30">
                  Rijswijk
                </span>
                <span className="px-4 py-2 glass rounded-full text-xs font-bold uppercase tracking-wider text-yellow-400 border border-yellow-500/30">
                  Zoetermeer
                </span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="animate-in slide-in-from-right duration-700 delay-200">
            {formSent ? (
              <div className="glass p-12 rounded-[3rem] border-green-500/30 text-center space-y-6">
                <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 neon-glow-blue">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12"
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
                </div>
                <h3 className="text-4xl font-black font-display uppercase tracking-tight">
                  {t("form_sent_title")}
                </h3>
                <p className="text-gray-400 text-lg leading-relaxed">
                  {t("form_sent_desc")}
                </p>
                <button
                  onClick={() => setFormSent(false)}
                  className="px-10 py-4 glass border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5"
                >
                  {lang === "nl" ? "Terug" : lang === "en" ? "Back" : "Powrót"}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleBookingSubmit}
                className="glass p-10 md:p-12 rounded-[3rem] border-white/5 shadow-2xl space-y-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-[100px] -z-10"></div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-2xl flex items-center justify-center">
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-black font-display uppercase tracking-widest text-sm">
                        {lang === "nl" ? "Uw Gegevens" : lang === "en" ? "Your Details" : "Twoje Dane"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {lang === "nl" ? "We hebben ze nodig om contact op te nemen" : lang === "en" ? "We need them to get in touch" : "Potrzebujemy ich do kontaktu"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                        {t("form_name")}
                      </label>
                      <input
                        name="name"
                        required
                        className="w-full glass bg-white/5 border-white/10 p-5 rounded-2xl focus:outline-none focus:border-pink-500 transition-all font-medium"
                        placeholder={lang === "nl" ? "bijv. Jan de Vries" : lang === "en" ? "e.g. John Smith" : "np. Jan Kowalski"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                        {t("form_email")}
                      </label>
                      <input
                        name="email"
                        required
                        type="email"
                        className="w-full glass bg-white/5 border-white/10 p-5 rounded-2xl focus:outline-none focus:border-pink-500 transition-all font-medium"
                        placeholder={lang === "nl" ? "contact@email.nl" : lang === "en" ? "contact@email.com" : "kontakt@twojmail.pl"}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center">
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-black font-display uppercase tracking-widest text-sm">
                        {lang === "nl" ? "Details" : lang === "en" ? "Details" : "Szczegóły"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {lang === "nl" ? "Vertel ons over uw evenement" : lang === "en" ? "Tell us about your event" : "Opisz nam swoje wydarzenie"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">
                      {t("form_message")}
                    </label>
                    <textarea
                      required
                      className="w-full glass bg-white/5 border-white/10 p-5 rounded-2xl min-h-[150px] focus:outline-none focus:border-pink-500 transition-all font-medium"
                      placeholder={t("contact_placeholder_msg")}
                    ></textarea>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {lang === "nl" ? "Geselecteerde Datum:" : lang === "en" ? "Selected Date:" : "Wybrany Termin:"}
                    </span>
                    <span className="text-sm font-black text-pink-400 font-display">
                      {selectedDate || (lang === "nl" ? "Niet geselecteerd" : lang === "en" ? "Not selected" : "Nie wybrano")}
                    </span>
                  </div>

                  <button
                    disabled={!selectedDate || submitting}
                    type="submit"
                    className={`w-full p-6 rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-2xl flex items-center justify-center gap-3 ${
                      selectedDate && !submitting
                        ? "bg-gradient-to-r from-pink-500 via-purple-600 to-blue-500 hover:scale-[1.02] neon-glow-pink"
                        : "glass text-gray-600 cursor-not-allowed border-white/5"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {lang === "pl"
                          ? "Wysyłanie..."
                          : lang === "nl"
                          ? "Verzenden..."
                          : "Submitting..."}
                      </>
                    ) : (
                      <>
                        {t("booking_btn")}
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
                            strokeWidth={3}
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
