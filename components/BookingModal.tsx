import React, { useState, useEffect } from "react";
import {
  CartItem,
  Language,
  DayOverride,
  CustomerDetails,
  BillingAddress,
} from "../types";
import { TRANSLATIONS } from "../constants";
import { fetchCalendarOverrides } from "../services/calendarService";
import {
  fetchBookedDates,
  createBookingWithDetails,
  calculateBTW,
} from "../services/bookingService";
import { processPayment } from "../services/stripeService";
import { trackEvent } from "../services/analyticsService";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  lang: Language;
  onSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  items,
  lang,
  onSuccess,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Billing address
  const [billingCompany, setBillingCompany] = useState("");
  const [billingKvk, setBillingKvk] = useState("");
  const [billingBtw, setBillingBtw] = useState("");
  const [billingStreet, setBillingStreet] = useState("");
  const [billingHouseNumber, setBillingHouseNumber] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingCountry, setBillingCountry] = useState("Nederland");

  // Delivery address
  const [deliverySameAsBilling, setDeliverySameAsBilling] = useState(true);
  const [deliveryStreet, setDeliveryStreet] = useState("");
  const [deliveryHouseNumber, setDeliveryHouseNumber] = useState("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryCountry, setDeliveryCountry] = useState("Nederland");

  const [notes, setNotes] = useState("");
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<
    "date" | "customer" | "address" | "confirm" | "success"
  >("date");

  const t = (key: string) => TRANSLATIONS[key]?.[lang] || key;
  // Prices are BRUTTO (including BTW), calculate netto and BTW from total
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const { subtotal, btwAmount } = calculateBTW(total, 21);

  useEffect(() => {
    if (isOpen) {
      loadCalendarData();
    }
  }, [isOpen]);

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

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();
  const monthName = currentMonth.toLocaleString(
    lang === "pl" ? "pl-PL" : lang === "nl" ? "nl-NL" : "en-US",
    { month: "long" }
  );
  const year = currentMonth.getFullYear();

  const handlePrevMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  const handleNextMonth = () =>
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );

  const getDayStatus = (dateStr: string) => {
    const override = overrides.find((o) => o.date === dateStr);
    if (override) return override.status;
    const hasBookings = bookedDates.includes(dateStr);
    if (hasBookings) return "partial";
    return "available";
  };

  const isDateSelectable = (dateStr: string) => {
    const status = getDayStatus(dateStr);
    const today = new Date().toISOString().split("T")[0];
    return status !== "blocked" && dateStr >= today;
  };

  const handleSubmit = async () => {
    if (!selectedDate || !customerName || !customerEmail || !billingStreet)
      return;

    try {
      setSubmitting(true);

      const billingAddress: BillingAddress = {
        company: billingCompany || undefined,
        kvk: billingKvk || undefined,
        btw: billingBtw || undefined,
        street: billingStreet,
        houseNumber: billingHouseNumber,
        postalCode: billingPostalCode,
        city: billingCity,
        country: billingCountry,
      };

      const deliveryAddress: BillingAddress | undefined = !deliverySameAsBilling
        ? {
            street: deliveryStreet,
            houseNumber: deliveryHouseNumber,
            postalCode: deliveryPostalCode,
            city: deliveryCity,
            country: deliveryCountry,
          }
        : undefined;

      const customer: CustomerDetails = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || undefined,
        billingAddress,
        deliveryAddress,
        deliverySameAsBilling,
      };

      await createBookingWithDetails(customer, selectedDate, items, notes);

      // Track conversion event for each product
      items.forEach((item) => {
        trackEvent("booking_completed", item.product.id, {
          quantity: item.quantity,
          date: selectedDate,
          totalPrice: total,
        });
      });

      setStep("success");
      setTimeout(() => {
        onSuccess();
        onClose();
        resetForm();
      }, 3000);
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Error creating booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedDate || !customerName || !customerEmail || !billingStreet)
      return;

    try {
      setSubmitting(true);

      const billingAddress: BillingAddress = {
        company: billingCompany || undefined,
        kvk: billingKvk || undefined,
        btw: billingBtw || undefined,
        street: billingStreet,
        houseNumber: billingHouseNumber,
        postalCode: billingPostalCode,
        city: billingCity,
        country: billingCountry,
      };

      const deliveryAddress: BillingAddress | undefined = !deliverySameAsBilling
        ? {
            street: deliveryStreet,
            houseNumber: deliveryHouseNumber,
            postalCode: deliveryPostalCode,
            city: deliveryCity,
            country: deliveryCountry,
          }
        : undefined;

      const customer: CustomerDetails = {
        name: customerName,
        email: customerEmail,
        phone: customerPhone || undefined,
        billingAddress,
        deliveryAddress,
        deliverySameAsBilling,
      };

      // Process payment via Stripe (will redirect to Stripe Checkout)
      const success = await processPayment({
        customerEmail,
        customerName,
        items,
        bookingDate: selectedDate,
        notes,
        customerDetails: customer,
      });

      if (!success) {
        throw new Error("Failed to process payment");
      }
      // Stripe will redirect, so no need to do anything else here
    } catch (error) {
      console.error("Error processing payment:", error);
      alert("Error processing payment. Please try again.");
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("date");
    setSelectedDate("");
    setCustomerName("");
    setCustomerEmail("");
    setCustomerPhone("");
    setBillingCompany("");
    setBillingKvk("");
    setBillingBtw("");
    setBillingStreet("");
    setBillingHouseNumber("");
    setBillingPostalCode("");
    setBillingCity("");
    setBillingCountry("Nederland");
    setDeliverySameAsBilling(true);
    setDeliveryStreet("");
    setDeliveryHouseNumber("");
    setDeliveryPostalCode("");
    setDeliveryCity("");
    setDeliveryCountry("Nederland");
    setNotes("");
  };

  const renderDays = () => {
    const days = [];
    const blanks = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    for (let i = 0; i < blanks; i++) {
      days.push(<div key={`blank-${i}`} className="p-2"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(currentMonth.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d).padStart(2, "0")}`;
      const status = getDayStatus(dateStr);
      const isSelected = selectedDate === dateStr;
      const isToday = new Date().toISOString().split("T")[0] === dateStr;
      const selectable = isDateSelectable(dateStr);

      let colorClass = "glass border-white/5 hover:border-pink-500/50";
      if (status === "available" && selectable)
        colorClass =
          "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20 cursor-pointer";
      if (status === "partial" && selectable)
        colorClass =
          "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20 cursor-pointer";
      if (status === "blocked" || !selectable)
        colorClass =
          "bg-red-500/10 border-red-500/20 text-red-400/50 cursor-not-allowed";

      if (isSelected) {
        colorClass =
          "bg-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] border-pink-400 ring-2 ring-pink-500/30 scale-110 z-10";
      }

      days.push(
        <button
          key={d}
          onClick={() => selectable && setSelectedDate(dateStr)}
          disabled={!selectable}
          className={`relative p-2 md:p-3 rounded-xl font-bold transition-all duration-300 flex items-center justify-center text-xs md:text-sm border ${colorClass} ${
            isToday ? "ring-1 ring-blue-500" : ""
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const labels = {
    name: { nl: "Naam", en: "Name", pl: "Imię i nazwisko" },
    email: { nl: "E-mail", en: "Email", pl: "E-mail" },
    phone: { nl: "Telefoon", en: "Phone", pl: "Telefon" },
    company: { nl: "Bedrijfsnaam", en: "Company name", pl: "Nazwa firmy" },
    kvk: { nl: "KVK-nummer", en: "Chamber of Commerce", pl: "KRS/REGON" },
    btw: { nl: "BTW-nummer", en: "VAT Number", pl: "NIP" },
    street: { nl: "Straat", en: "Street", pl: "Ulica" },
    houseNumber: { nl: "Huisnr.", en: "House No.", pl: "Nr domu" },
    postalCode: { nl: "Postcode", en: "Postal Code", pl: "Kod pocztowy" },
    city: { nl: "Plaats", en: "City", pl: "Miasto" },
    country: { nl: "Land", en: "Country", pl: "Kraj" },
    billingAddress: {
      nl: "Factuuradres",
      en: "Billing Address",
      pl: "Adres do faktury",
    },
    deliveryAddress: {
      nl: "Afleveradres",
      en: "Delivery Address",
      pl: "Adres dostawy",
    },
    sameAsBilling: {
      nl: "Hetzelfde als factuuradres",
      en: "Same as billing address",
      pl: "Taki sam jak adres do faktury",
    },
    notes: { nl: "Opmerkingen", en: "Notes", pl: "Uwagi" },
    optional: { nl: "Optioneel", en: "Optional", pl: "Opcjonalnie" },
    businessCustomer: {
      nl: "Zakelijke klant?",
      en: "Business customer?",
      pl: "Klient biznesowy?",
    },
    subtotal: { nl: "Subtotaal", en: "Subtotal", pl: "Suma netto" },
    btw21: { nl: "BTW (21%)", en: "VAT (21%)", pl: "VAT (21%)" },
    total: { nl: "Totaal", en: "Total", pl: "Razem" },
    step1: { nl: "Datum", en: "Date", pl: "Data" },
    step2: { nl: "Gegevens", en: "Details", pl: "Dane" },
    step3: { nl: "Adres", en: "Address", pl: "Adres" },
    step4: { nl: "Bevestigen", en: "Confirm", pl: "Potwierdź" },
    next: { nl: "Volgende", en: "Next", pl: "Dalej" },
    back: { nl: "Terug", en: "Back", pl: "Wstecz" },
    confirm: {
      nl: "Reservering Bevestigen",
      en: "Confirm Booking",
      pl: "Potwierdź rezerwację",
    },
    success: {
      nl: "Reservering ontvangen!",
      en: "Booking Received!",
      pl: "Rezerwacja przyjęta!",
    },
    successMsg: {
      nl: "We nemen binnenkort contact met u op.",
      en: "We will contact you shortly.",
      pl: "Skontaktujemy się z Tobą wkrótce.",
    },
    submitting: { nl: "Verzenden...", en: "Submitting...", pl: "Wysyłanie..." },
  };

  const L = (key: keyof typeof labels) => labels[key][lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="glass w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl border-pink-500/20 my-8">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-pink-500/10 to-purple-500/10">
          <div>
            <h2 className="text-2xl font-black font-display tracking-tight">
              {t("booking_title")}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {step === "date" && L("step1")}
              {step === "customer" && L("step2")}
              {step === "address" && L("step3")}
              {step === "confirm" && L("step4")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 glass rounded-full hover:bg-white/10 transition-all"
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

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-center gap-2 md:gap-4">
          {(["date", "customer", "address", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === s
                    ? "bg-pink-500 text-white"
                    : ["date", "customer", "address", "confirm"].indexOf(step) >
                      i
                    ? "bg-green-500 text-white"
                    : "glass text-gray-500"
                }`}
              >
                {["date", "customer", "address", "confirm"].indexOf(step) > i
                  ? "✓"
                  : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`w-6 md:w-12 h-0.5 ${
                    ["date", "customer", "address", "confirm"].indexOf(step) > i
                      ? "bg-green-500"
                      : "bg-white/10"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 md:p-8 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : step === "success" ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
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
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-3xl font-black font-display mb-4">
                {L("success")}
              </h3>
              <p className="text-gray-400">{L("successMsg")}</p>
            </div>
          ) : step === "date" ? (
            <div className="space-y-6">
              {/* Calendar */}
              <div className="glass rounded-2xl p-6 border-white/5">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black font-display uppercase tracking-tighter">
                    {monthName} <span className="text-pink-500">{year}</span>
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 glass rounded-lg hover:bg-white/10"
                    >
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
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 glass rounded-lg hover:bg-white/10"
                    >
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                  {[
                    lang === "pl" ? "Pn" : lang === "nl" ? "Ma" : "Mo",
                    lang === "pl" ? "Wt" : lang === "nl" ? "Di" : "Tu",
                    lang === "pl" ? "Śr" : lang === "nl" ? "Wo" : "We",
                    lang === "pl" ? "Cz" : lang === "nl" ? "Do" : "Th",
                    lang === "pl" ? "Pt" : lang === "nl" ? "Vr" : "Fr",
                    lang === "pl" ? "Sb" : lang === "nl" ? "Za" : "Sa",
                    lang === "pl" ? "Nd" : lang === "nl" ? "Zo" : "Su",
                  ].map((day) => (
                    <div
                      key={day}
                      className="text-center text-[10px] font-black uppercase tracking-wider text-gray-500 pb-2"
                    >
                      {day}
                    </div>
                  ))}
                  {renderDays()}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/10 text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-400">{t("cal_available")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-gray-400">{t("cal_partial")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-gray-400">{t("cal_blocked")}</span>
                  </div>
                </div>
              </div>

              {selectedDate && (
                <div className="glass rounded-2xl p-4 border-pink-500/30 bg-pink-500/5">
                  <p className="text-sm">
                    <span className="text-gray-400">
                      {lang === "pl"
                        ? "Wybrana data:"
                        : lang === "nl"
                        ? "Geselecteerde datum:"
                        : "Selected date:"}
                    </span>
                    <span className="font-black text-pink-500 ml-2">
                      {new Date(selectedDate).toLocaleDateString(
                        lang === "pl"
                          ? "pl-PL"
                          : lang === "nl"
                          ? "nl-NL"
                          : "en-US",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </span>
                  </p>
                </div>
              )}
            </div>
          ) : step === "customer" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    {L("name")} *
                  </label>
                  <input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full glass p-4 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all"
                    placeholder="Jan Kowalski"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    {L("email")} *
                  </label>
                  <input
                    required
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full glass p-4 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all"
                    placeholder="jan@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {L("phone")}{" "}
                  <span className="text-gray-600">({L("optional")})</span>
                </label>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full glass p-4 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all"
                  placeholder="+31 6 12345678"
                />
              </div>

              {/* Business customer section */}
              <div className="glass rounded-2xl p-6 border-white/5 space-y-4">
                <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">
                  {L("businessCustomer")}{" "}
                  <span className="text-gray-600">({L("optional")})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("company")}
                    </label>
                    <input
                      value={billingCompany}
                      onChange={(e) => setBillingCompany(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="Bedrijfsnaam B.V."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("kvk")}
                    </label>
                    <input
                      value={billingKvk}
                      onChange={(e) => setBillingKvk(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="12345678"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("btw")}
                    </label>
                    <input
                      value={billingBtw}
                      onChange={(e) => setBillingBtw(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="NL123456789B01"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : step === "address" ? (
            <div className="space-y-6">
              {/* Billing Address */}
              <div className="glass rounded-2xl p-6 border-white/5 space-y-4">
                <h4 className="font-black text-sm uppercase tracking-widest text-pink-500">
                  {L("billingAddress")} *
                </h4>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-3">
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("street")}
                    </label>
                    <input
                      required
                      value={billingStreet}
                      onChange={(e) => setBillingStreet(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="Hoofdstraat"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("houseNumber")}
                    </label>
                    <input
                      required
                      value={billingHouseNumber}
                      onChange={(e) => setBillingHouseNumber(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="123A"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("postalCode")}
                    </label>
                    <input
                      required
                      value={billingPostalCode}
                      onChange={(e) => setBillingPostalCode(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="1234 AB"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("city")}
                    </label>
                    <input
                      required
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      placeholder="Den Haag"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-500 mb-2">
                      {L("country")}
                    </label>
                    <input
                      value={billingCountry}
                      onChange={(e) => setBillingCountry(e.target.value)}
                      className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="glass rounded-2xl p-6 border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm uppercase tracking-widest text-blue-500">
                    {L("deliveryAddress")}
                  </h4>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deliverySameAsBilling}
                      onChange={(e) =>
                        setDeliverySameAsBilling(e.target.checked)
                      }
                      className="w-5 h-5 rounded bg-white/10 border-white/20 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-xs text-gray-400">
                      {L("sameAsBilling")}
                    </span>
                  </label>
                </div>

                {!deliverySameAsBilling && (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-4 pt-4">
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-xs font-black text-gray-500 mb-2">
                        {L("street")}
                      </label>
                      <input
                        value={deliveryStreet}
                        onChange={(e) => setDeliveryStreet(e.target.value)}
                        className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-2">
                        {L("houseNumber")}
                      </label>
                      <input
                        value={deliveryHouseNumber}
                        onChange={(e) => setDeliveryHouseNumber(e.target.value)}
                        className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-500 mb-2">
                        {L("postalCode")}
                      </label>
                      <input
                        value={deliveryPostalCode}
                        onChange={(e) => setDeliveryPostalCode(e.target.value)}
                        className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-black text-gray-500 mb-2">
                        {L("city")}
                      </label>
                      <input
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        className="w-full glass p-3 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  {L("notes")}{" "}
                  <span className="text-gray-600">({L("optional")})</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full glass p-4 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all min-h-[80px] text-sm"
                  placeholder={
                    lang === "pl"
                      ? "Dodatkowe informacje..."
                      : lang === "nl"
                      ? "Extra informatie..."
                      : "Additional information..."
                  }
                />
              </div>
            </div>
          ) : step === "confirm" ? (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="glass rounded-2xl p-6 border-white/5">
                <h4 className="font-black uppercase text-sm tracking-widest text-gray-400 mb-4">
                  {lang === "pl"
                    ? "Podsumowanie zamówienia"
                    : lang === "nl"
                    ? "Besteloverzicht"
                    : "Order Summary"}
                </h4>

                {/* Products */}
                <div className="space-y-3 mb-6">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 p-3 bg-white/5 rounded-xl"
                    >
                      <img
                        src={item.product.image}
                        className="w-16 h-16 object-cover rounded-lg"
                        alt=""
                      />
                      <div className="flex-1">
                        <h5 className="font-bold text-sm">
                          {item.product.name[lang]}
                        </h5>
                        <p className="text-xs text-gray-500">
                          x{item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-pink-500">
                          €{(item.product.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals with BTW */}
                <div className="border-t border-white/10 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{L("subtotal")}</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{L("btw21")}</span>
                    <span>€{btwAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="font-black text-lg">{L("total")}</span>
                    <span className="text-3xl font-black text-pink-500">
                      €{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer & Address Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass rounded-2xl p-6 border-white/5">
                  <h5 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-3">
                    {L("step2")}
                  </h5>
                  <p className="font-bold">{customerName}</p>
                  <p className="text-sm text-gray-400">{customerEmail}</p>
                  {customerPhone && (
                    <p className="text-sm text-gray-400">{customerPhone}</p>
                  )}
                  {billingCompany && (
                    <p className="text-sm text-gray-400 mt-2">
                      {billingCompany}
                    </p>
                  )}
                  {billingKvk && (
                    <p className="text-xs text-gray-500">KVK: {billingKvk}</p>
                  )}
                  {billingBtw && (
                    <p className="text-xs text-gray-500">BTW: {billingBtw}</p>
                  )}
                </div>
                <div className="glass rounded-2xl p-6 border-white/5">
                  <h5 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-3">
                    {L("billingAddress")}
                  </h5>
                  <p className="text-sm">
                    {billingStreet} {billingHouseNumber}
                  </p>
                  <p className="text-sm">
                    {billingPostalCode} {billingCity}
                  </p>
                  <p className="text-sm text-gray-400">{billingCountry}</p>
                </div>
              </div>

              {/* Date */}
              <div className="glass rounded-2xl p-4 border-pink-500/30 bg-pink-500/5">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{L("step1")}:</span>
                  <span className="font-black text-pink-500">
                    {new Date(selectedDate).toLocaleDateString(
                      lang === "pl"
                        ? "pl-PL"
                        : lang === "nl"
                        ? "nl-NL"
                        : "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {step !== "success" && (
          <div className="p-6 border-t border-white/10 flex justify-between gap-4">
            {step !== "date" ? (
              <button
                onClick={() => {
                  if (step === "customer") setStep("date");
                  else if (step === "address") setStep("customer");
                  else if (step === "confirm") setStep("address");
                }}
                className="px-8 py-4 glass rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10"
              >
                {L("back")}
              </button>
            ) : (
              <div></div>
            )}

            {step === "date" && (
              <button
                onClick={() => setStep("customer")}
                disabled={!selectedDate}
                className="px-8 py-4 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed neon-glow-pink"
              >
                {L("next")}
              </button>
            )}
            {step === "customer" && (
              <button
                onClick={() => setStep("address")}
                disabled={!customerName || !customerEmail}
                className="px-8 py-4 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed neon-glow-pink"
              >
                {L("next")}
              </button>
            )}
            {step === "address" && (
              <button
                onClick={() => setStep("confirm")}
                disabled={
                  !billingStreet ||
                  !billingHouseNumber ||
                  !billingPostalCode ||
                  !billingCity
                }
                className="px-8 py-4 bg-white text-black rounded-xl text-xs font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed neon-glow-pink"
              >
                {L("next")}
              </button>
            )}
            {step === "confirm" && (
              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-4 glass border-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? L("submitting") : L("confirm")}
                </button>
                <button
                  onClick={handlePaymentSubmit}
                  disabled={submitting}
                  className="flex-1 px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg neon-glow-pink flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    L("submitting")
                  ) : (
                    <>
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
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      {lang === "pl"
                        ? "Zapłać (Karta/iDEAL)"
                        : lang === "nl"
                        ? "Betaal (Kaart/iDEAL)"
                        : "Pay (Card/iDEAL)"}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
