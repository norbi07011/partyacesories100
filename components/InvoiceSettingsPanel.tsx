import React, { useState, useEffect, useRef } from "react";
import { InvoiceSettings, Language } from "../types";
import {
  fetchInvoiceSettings,
  updateInvoiceSettings,
  uploadInvoiceLogo,
  uploadWatermark,
  getDefaultSettings,
} from "../services/invoiceSettingsService";

interface InvoiceSettingsPanelProps {
  lang: Language;
  onClose: () => void;
}

const InvoiceSettingsPanel: React.FC<InvoiceSettingsPanelProps> = ({
  lang,
  onClose,
}) => {
  const [settings, setSettings] = useState<InvoiceSettings>(
    getDefaultSettings()
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "company" | "branding" | "visibility" | "invoice"
  >("company");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const labels = {
    title: {
      nl: "Factuur Instellingen",
      en: "Invoice Settings",
      pl: "Ustawienia Faktury",
    },
    save: { nl: "Opslaan", en: "Save", pl: "Zapisz" },
    saving: { nl: "Opslaan...", en: "Saving...", pl: "Zapisywanie..." },
    saved: {
      nl: "Instellingen opgeslagen!",
      en: "Settings saved!",
      pl: "Ustawienia zapisane!",
    },
    error: { nl: "Fout bij opslaan", en: "Error saving", pl: "Błąd zapisu" },
    close: { nl: "Sluiten", en: "Close", pl: "Zamknij" },

    // Tabs
    tabCompany: {
      nl: "Bedrijfsgegevens",
      en: "Company Info",
      pl: "Dane Firmy",
    },
    tabBranding: { nl: "Branding", en: "Branding", pl: "Branding" },
    tabVisibility: { nl: "Zichtbaarheid", en: "Visibility", pl: "Widoczność" },
    tabInvoice: { nl: "Factuur", en: "Invoice", pl: "Faktura" },

    // Company Info
    companyName: { nl: "Bedrijfsnaam", en: "Company Name", pl: "Nazwa Firmy" },
    street: { nl: "Straat", en: "Street", pl: "Ulica" },
    houseNumber: { nl: "Huisnummer", en: "House Number", pl: "Numer Domu" },
    postalCode: { nl: "Postcode", en: "Postal Code", pl: "Kod Pocztowy" },
    city: { nl: "Stad", en: "City", pl: "Miasto" },
    country: { nl: "Land", en: "Country", pl: "Kraj" },
    phone: { nl: "Telefoon", en: "Phone", pl: "Telefon" },
    email: { nl: "E-mail", en: "Email", pl: "E-mail" },
    website: { nl: "Website", en: "Website", pl: "Strona WWW" },
    kvk: { nl: "KVK Nummer", en: "CoC Number", pl: "Numer KRS" },
    btw: { nl: "BTW Nummer", en: "VAT Number", pl: "Numer NIP" },
    iban: { nl: "IBAN", en: "IBAN", pl: "IBAN" },
    bic: { nl: "BIC/SWIFT", en: "BIC/SWIFT", pl: "BIC/SWIFT" },

    // Branding
    logo: { nl: "Logo", en: "Logo", pl: "Logo" },
    uploadLogo: { nl: "Upload Logo", en: "Upload Logo", pl: "Prześlij Logo" },
    watermark: { nl: "Watermerk", en: "Watermark", pl: "Znak Wodny" },
    uploadWatermark: {
      nl: "Upload Watermerk",
      en: "Upload Watermark",
      pl: "Prześlij Znak Wodny",
    },
    primaryColor: {
      nl: "Primaire Kleur",
      en: "Primary Color",
      pl: "Kolor Główny",
    },
    secondaryColor: {
      nl: "Secundaire Kleur",
      en: "Secondary Color",
      pl: "Kolor Drugorzędny",
    },
    accentColor: {
      nl: "Accent Kleur",
      en: "Accent Color",
      pl: "Kolor Akcentu",
    },
    removeLogo: { nl: "Verwijder", en: "Remove", pl: "Usuń" },

    // Visibility
    showLogo: { nl: "Toon Logo", en: "Show Logo", pl: "Pokaż Logo" },
    showWatermark: {
      nl: "Toon Watermerk",
      en: "Show Watermark",
      pl: "Pokaż Znak Wodny",
    },
    showCompanyDetails: {
      nl: "Toon Bedrijfsgegevens",
      en: "Show Company Details",
      pl: "Pokaż Dane Firmy",
    },
    showKvk: {
      nl: "Toon KVK Nummer",
      en: "Show CoC Number",
      pl: "Pokaż Numer KRS",
    },
    showBtw: {
      nl: "Toon BTW Nummer",
      en: "Show VAT Number",
      pl: "Pokaż Numer NIP",
    },
    showIban: { nl: "Toon IBAN", en: "Show IBAN", pl: "Pokaż IBAN" },
    showPaymentSection: {
      nl: "Toon Betalingsgegevens",
      en: "Show Payment Section",
      pl: "Pokaż Sekcję Płatności",
    },
    showProductImages: {
      nl: "Toon Productafbeeldingen",
      en: "Show Product Images",
      pl: "Pokaż Zdjęcia Produktów",
    },
    showProductDescriptions: {
      nl: "Toon Productomschrijvingen",
      en: "Show Product Descriptions",
      pl: "Pokaż Opisy Produktów",
    },
    showThankYou: {
      nl: "Toon Bedankt Bericht",
      en: "Show Thank You Message",
      pl: "Pokaż Podziękowanie",
    },

    // Invoice
    invoicePrefix: {
      nl: "Factuurnummer Prefix",
      en: "Invoice Number Prefix",
      pl: "Prefiks Numeru Faktury",
    },
    paymentTerms: {
      nl: "Betalingstermijn (dagen)",
      en: "Payment Terms (days)",
      pl: "Termin Płatności (dni)",
    },
    defaultBtw: {
      nl: "Standaard BTW %",
      en: "Default VAT %",
      pl: "Domyślny VAT %",
    },
    thankYouNl: {
      nl: "Bedankt Bericht (NL)",
      en: "Thank You Message (NL)",
      pl: "Podziękowanie (NL)",
    },
    thankYouEn: {
      nl: "Bedankt Bericht (EN)",
      en: "Thank You Message (EN)",
      pl: "Podziękowanie (EN)",
    },
    thankYouPl: {
      nl: "Bedankt Bericht (PL)",
      en: "Thank You Message (PL)",
      pl: "Podziękowanie (PL)",
    },
    footerText: { nl: "Voettekst", en: "Footer Text", pl: "Tekst Stopki" },

    // Preview
    preview: { nl: "Voorbeeld", en: "Preview", pl: "Podgląd" },
  };

  const L = (key: keyof typeof labels) => labels[key][lang];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoiceSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateInvoiceSettings(settings.id, settings);
      setMessage({ type: "success", text: L("saved") });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: L("error") });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadInvoiceLogo(file);
      setSettings((prev) => ({ ...prev, logoUrl: url }));
    } catch (error) {
      console.error("Error uploading logo:", error);
    }
  };

  const handleWatermarkUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadWatermark(file);
      setSettings((prev) => ({ ...prev, watermarkUrl: url }));
    } catch (error) {
      console.error("Error uploading watermark:", error);
    }
  };

  const handleInputChange = (field: keyof InvoiceSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
  }> = ({ checked, onChange, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-pink-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  const ColorPicker: React.FC<{
    label: string;
    value: string;
    onChange: (value: string) => void;
  }> = ({ label, value, onChange }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          placeholder="#000000"
        />
        <div
          className="w-24 h-10 rounded-lg border border-gray-200"
          style={{ backgroundColor: value }}
        />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-pink-500 to-purple-600">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {L("title")}
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          {(["company", "branding", "visibility", "invoice"] as const).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "text-pink-600 border-b-2 border-pink-500 bg-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab === "company" && L("tabCompany")}
                {tab === "branding" && L("tabBranding")}
                {tab === "visibility" && L("tabVisibility")}
                {tab === "invoice" && L("tabInvoice")}
              </button>
            )
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Company Info Tab */}
          {activeTab === "company" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("companyName")}
                </label>
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("street")}
                </label>
                <input
                  type="text"
                  value={settings.companyStreet}
                  onChange={(e) =>
                    handleInputChange("companyStreet", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("houseNumber")}
                </label>
                <input
                  type="text"
                  value={settings.companyHouseNumber}
                  onChange={(e) =>
                    handleInputChange("companyHouseNumber", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("postalCode")}
                </label>
                <input
                  type="text"
                  value={settings.companyPostalCode}
                  onChange={(e) =>
                    handleInputChange("companyPostalCode", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("city")}
                </label>
                <input
                  type="text"
                  value={settings.companyCity}
                  onChange={(e) =>
                    handleInputChange("companyCity", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("country")}
                </label>
                <input
                  type="text"
                  value={settings.companyCountry}
                  onChange={(e) =>
                    handleInputChange("companyCountry", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("phone")}
                </label>
                <input
                  type="text"
                  value={settings.companyPhone}
                  onChange={(e) =>
                    handleInputChange("companyPhone", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("email")}
                </label>
                <input
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) =>
                    handleInputChange("companyEmail", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("website")}
                </label>
                <input
                  type="text"
                  value={settings.companyWebsite}
                  onChange={(e) =>
                    handleInputChange("companyWebsite", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Gegevens voor Zakelijke Klanten
                </h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("kvk")}
                </label>
                <input
                  type="text"
                  value={settings.companyKvk}
                  onChange={(e) =>
                    handleInputChange("companyKvk", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("btw")}
                </label>
                <input
                  type="text"
                  value={settings.companyBtw}
                  onChange={(e) =>
                    handleInputChange("companyBtw", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("iban")}
                </label>
                <input
                  type="text"
                  value={settings.companyIban}
                  onChange={(e) =>
                    handleInputChange("companyIban", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("bic")}
                </label>
                <input
                  type="text"
                  value={settings.companyBic}
                  onChange={(e) =>
                    handleInputChange("companyBic", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono"
                />
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {activeTab === "branding" && (
            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-pink-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {L("logo")}
                </h3>

                <div className="flex items-center gap-6">
                  {settings.logoUrl ? (
                    <div className="relative">
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="w-32 h-32 object-contain border-2 border-gray-200 rounded-xl bg-white p-2"
                      />
                      <button
                        onClick={() => handleInputChange("logoUrl", undefined)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg
                          className="w-4 h-4"
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
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-white">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}

                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleLogoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      {L("uploadLogo")}
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      PNG, JPG of SVG (max. 2MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Watermark Upload */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-purple-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  {L("watermark")}
                </h3>

                <div className="flex items-center gap-6">
                  {settings.watermarkUrl ? (
                    <div className="relative">
                      <img
                        src={settings.watermarkUrl}
                        alt="Watermark"
                        className="w-32 h-32 object-contain border-2 border-gray-200 rounded-xl bg-white p-2 opacity-50"
                      />
                      <button
                        onClick={() =>
                          handleInputChange("watermarkUrl", undefined)
                        }
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <svg
                          className="w-4 h-4"
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
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-white">
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                        />
                      </svg>
                    </div>
                  )}

                  <div>
                    <input
                      type="file"
                      ref={watermarkInputRef}
                      onChange={handleWatermarkUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => watermarkInputRef.current?.click()}
                      className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                        />
                      </svg>
                      {L("uploadWatermark")}
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                      PNG met transparantie aanbevolen
                    </p>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                    />
                  </svg>
                  Kleuren
                </h3>

                <ColorPicker
                  label={L("primaryColor")}
                  value={settings.primaryColor}
                  onChange={(value) => handleInputChange("primaryColor", value)}
                />

                <ColorPicker
                  label={L("secondaryColor")}
                  value={settings.secondaryColor}
                  onChange={(value) =>
                    handleInputChange("secondaryColor", value)
                  }
                />

                <ColorPicker
                  label={L("accentColor")}
                  value={settings.accentColor}
                  onChange={(value) => handleInputChange("accentColor", value)}
                />
              </div>
            </div>
          )}

          {/* Visibility Tab */}
          {activeTab === "visibility" && (
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Elementen Zichtbaarheid
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Bepaal welke elementen zichtbaar zijn op de factuur.
              </p>

              <div className="space-y-1">
                <ToggleSwitch
                  checked={settings.showLogo}
                  onChange={(value) => handleInputChange("showLogo", value)}
                  label={L("showLogo")}
                />
                <ToggleSwitch
                  checked={settings.showWatermark}
                  onChange={(value) =>
                    handleInputChange("showWatermark", value)
                  }
                  label={L("showWatermark")}
                />
                <ToggleSwitch
                  checked={settings.showCompanyDetails}
                  onChange={(value) =>
                    handleInputChange("showCompanyDetails", value)
                  }
                  label={L("showCompanyDetails")}
                />
                <ToggleSwitch
                  checked={settings.showKvk}
                  onChange={(value) => handleInputChange("showKvk", value)}
                  label={L("showKvk")}
                />
                <ToggleSwitch
                  checked={settings.showBtw}
                  onChange={(value) => handleInputChange("showBtw", value)}
                  label={L("showBtw")}
                />
                <ToggleSwitch
                  checked={settings.showIban}
                  onChange={(value) => handleInputChange("showIban", value)}
                  label={L("showIban")}
                />
                <ToggleSwitch
                  checked={settings.showPaymentSection}
                  onChange={(value) =>
                    handleInputChange("showPaymentSection", value)
                  }
                  label={L("showPaymentSection")}
                />
                <ToggleSwitch
                  checked={settings.showProductImages}
                  onChange={(value) =>
                    handleInputChange("showProductImages", value)
                  }
                  label={L("showProductImages")}
                />
                <ToggleSwitch
                  checked={settings.showProductDescriptions}
                  onChange={(value) =>
                    handleInputChange("showProductDescriptions", value)
                  }
                  label={L("showProductDescriptions")}
                />
                <ToggleSwitch
                  checked={settings.showThankYouMessage}
                  onChange={(value) =>
                    handleInputChange("showThankYouMessage", value)
                  }
                  label={L("showThankYou")}
                />
              </div>
            </div>
          )}

          {/* Invoice Tab */}
          {activeTab === "invoice" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {L("invoicePrefix")}
                  </label>
                  <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={(e) =>
                      handleInputChange("invoicePrefix", e.target.value)
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent font-mono"
                    placeholder="INV"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Bijv: INV-2026-001
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {L("paymentTerms")}
                  </label>
                  <input
                    type="number"
                    value={settings.paymentTermsDays}
                    onChange={(e) =>
                      handleInputChange(
                        "paymentTermsDays",
                        parseInt(e.target.value) || 14
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    min="1"
                    max="90"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {L("defaultBtw")}
                  </label>
                  <input
                    type="number"
                    value={settings.defaultBtwPercentage}
                    onChange={(e) =>
                      handleInputChange(
                        "defaultBtwPercentage",
                        parseFloat(e.target.value) || 21
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Bedankt Berichten
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {L("thankYouNl")} 🇳🇱
                    </label>
                    <input
                      type="text"
                      value={settings.thankYouMessageNl}
                      onChange={(e) =>
                        handleInputChange("thankYouMessageNl", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {L("thankYouEn")} 🇬🇧
                    </label>
                    <input
                      type="text"
                      value={settings.thankYouMessageEn}
                      onChange={(e) =>
                        handleInputChange("thankYouMessageEn", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {L("thankYouPl")} 🇵🇱
                    </label>
                    <input
                      type="text"
                      value={settings.thankYouMessagePl}
                      onChange={(e) =>
                        handleInputChange("thankYouMessagePl", e.target.value)
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {L("footerText")}
                </label>
                <textarea
                  value={settings.footerText || ""}
                  onChange={(e) =>
                    handleInputChange("footerText", e.target.value)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  rows={3}
                  placeholder="Extra informatie die onderaan de factuur verschijnt..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          {message && (
            <div
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                message.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {L("close")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {L("saving")}
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
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
                  {L("save")}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSettingsPanel;
