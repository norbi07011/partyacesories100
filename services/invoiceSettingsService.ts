import { supabase } from "./supabaseClient";
import { InvoiceSettings } from "../types";

const isSupabaseReady = (): boolean => !!supabase;

interface DBInvoiceSettings {
  id: string;
  company_name: string;
  company_street: string;
  company_house_number: string;
  company_postal_code: string;
  company_city: string;
  company_country: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_kvk: string;
  company_btw: string;
  company_iban: string;
  company_bic: string;
  logo_url: string | null;
  watermark_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  show_logo: boolean;
  show_watermark: boolean;
  show_company_details: boolean;
  show_kvk: boolean;
  show_btw: boolean;
  show_iban: boolean;
  show_payment_section: boolean;
  show_product_images: boolean;
  show_product_descriptions: boolean;
  show_thank_you_message: boolean;
  invoice_prefix: string;
  payment_terms_days: number;
  default_btw_percentage: number;
  thank_you_message_nl: string;
  thank_you_message_en: string;
  thank_you_message_pl: string;
  footer_text: string | null;
}

const mapDBToSettings = (db: DBInvoiceSettings): InvoiceSettings => ({
  id: db.id,
  companyName: db.company_name,
  companyStreet: db.company_street,
  companyHouseNumber: db.company_house_number,
  companyPostalCode: db.company_postal_code,
  companyCity: db.company_city,
  companyCountry: db.company_country,
  companyPhone: db.company_phone,
  companyEmail: db.company_email,
  companyWebsite: db.company_website,
  companyKvk: db.company_kvk,
  companyBtw: db.company_btw,
  companyIban: db.company_iban,
  companyBic: db.company_bic,
  logoUrl: db.logo_url || undefined,
  watermarkUrl: db.watermark_url || undefined,
  primaryColor: db.primary_color,
  secondaryColor: db.secondary_color,
  accentColor: db.accent_color,
  showLogo: db.show_logo,
  showWatermark: db.show_watermark,
  showCompanyDetails: db.show_company_details,
  showKvk: db.show_kvk,
  showBtw: db.show_btw,
  showIban: db.show_iban,
  showPaymentSection: db.show_payment_section,
  showProductImages: db.show_product_images,
  showProductDescriptions: db.show_product_descriptions,
  showThankYouMessage: db.show_thank_you_message,
  invoicePrefix: db.invoice_prefix,
  paymentTermsDays: db.payment_terms_days,
  defaultBtwPercentage: Number(db.default_btw_percentage),
  thankYouMessageNl: db.thank_you_message_nl,
  thankYouMessageEn: db.thank_you_message_en,
  thankYouMessagePl: db.thank_you_message_pl,
  footerText: db.footer_text || undefined,
});

const mapSettingsToDB = (
  settings: Partial<InvoiceSettings>
): Record<string, any> => {
  const result: Record<string, any> = {};

  if (settings.companyName !== undefined)
    result.company_name = settings.companyName;
  if (settings.companyStreet !== undefined)
    result.company_street = settings.companyStreet;
  if (settings.companyHouseNumber !== undefined)
    result.company_house_number = settings.companyHouseNumber;
  if (settings.companyPostalCode !== undefined)
    result.company_postal_code = settings.companyPostalCode;
  if (settings.companyCity !== undefined)
    result.company_city = settings.companyCity;
  if (settings.companyCountry !== undefined)
    result.company_country = settings.companyCountry;
  if (settings.companyPhone !== undefined)
    result.company_phone = settings.companyPhone;
  if (settings.companyEmail !== undefined)
    result.company_email = settings.companyEmail;
  if (settings.companyWebsite !== undefined)
    result.company_website = settings.companyWebsite;
  if (settings.companyKvk !== undefined)
    result.company_kvk = settings.companyKvk;
  if (settings.companyBtw !== undefined)
    result.company_btw = settings.companyBtw;
  if (settings.companyIban !== undefined)
    result.company_iban = settings.companyIban;
  if (settings.companyBic !== undefined)
    result.company_bic = settings.companyBic;
  if (settings.logoUrl !== undefined)
    result.logo_url = settings.logoUrl || null;
  if (settings.watermarkUrl !== undefined)
    result.watermark_url = settings.watermarkUrl || null;
  if (settings.primaryColor !== undefined)
    result.primary_color = settings.primaryColor;
  if (settings.secondaryColor !== undefined)
    result.secondary_color = settings.secondaryColor;
  if (settings.accentColor !== undefined)
    result.accent_color = settings.accentColor;
  if (settings.showLogo !== undefined) result.show_logo = settings.showLogo;
  if (settings.showWatermark !== undefined)
    result.show_watermark = settings.showWatermark;
  if (settings.showCompanyDetails !== undefined)
    result.show_company_details = settings.showCompanyDetails;
  if (settings.showKvk !== undefined) result.show_kvk = settings.showKvk;
  if (settings.showBtw !== undefined) result.show_btw = settings.showBtw;
  if (settings.showIban !== undefined) result.show_iban = settings.showIban;
  if (settings.showPaymentSection !== undefined)
    result.show_payment_section = settings.showPaymentSection;
  if (settings.showProductImages !== undefined)
    result.show_product_images = settings.showProductImages;
  if (settings.showProductDescriptions !== undefined)
    result.show_product_descriptions = settings.showProductDescriptions;
  if (settings.showThankYouMessage !== undefined)
    result.show_thank_you_message = settings.showThankYouMessage;
  if (settings.invoicePrefix !== undefined)
    result.invoice_prefix = settings.invoicePrefix;
  if (settings.paymentTermsDays !== undefined)
    result.payment_terms_days = settings.paymentTermsDays;
  if (settings.defaultBtwPercentage !== undefined)
    result.default_btw_percentage = settings.defaultBtwPercentage;
  if (settings.thankYouMessageNl !== undefined)
    result.thank_you_message_nl = settings.thankYouMessageNl;
  if (settings.thankYouMessageEn !== undefined)
    result.thank_you_message_en = settings.thankYouMessageEn;
  if (settings.thankYouMessagePl !== undefined)
    result.thank_you_message_pl = settings.thankYouMessagePl;
  if (settings.footerText !== undefined)
    result.footer_text = settings.footerText || null;

  result.updated_at = new Date().toISOString();

  return result;
};

export const fetchInvoiceSettings =
  async (): Promise<InvoiceSettings | null> => {
    if (!isSupabaseReady()) return null;
    const { data, error } = await supabase
      .from("invoice_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching invoice settings:", error);
      return null;
    }

    return mapDBToSettings(data as DBInvoiceSettings);
  };

export const updateInvoiceSettings = async (
  id: string,
  settings: Partial<InvoiceSettings>
): Promise<InvoiceSettings | null> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const dbData = mapSettingsToDB(settings);

  const { data, error } = await supabase
    .from("invoice_settings")
    .update(dbData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating invoice settings:", error);
    throw error;
  }

  return mapDBToSettings(data as DBInvoiceSettings);
};

export const uploadInvoiceLogo = async (file: File): Promise<string> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const fileExt = file.name.split(".").pop();
  const fileName = `invoice-logo-${Date.now()}.${fileExt}`;
  const filePath = `logos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading logo:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
};

export const uploadWatermark = async (file: File): Promise<string> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const fileExt = file.name.split(".").pop();
  const fileName = `watermark-${Date.now()}.${fileExt}`;
  const filePath = `watermarks/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    console.error("Error uploading watermark:", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("images").getPublicUrl(filePath);
  return data.publicUrl;
};

// Default settings for fallback
export const getDefaultSettings = (): InvoiceSettings => ({
  id: "",
  companyName: "Party Accessoires Verhuur",
  companyStreet: "Voorbeeldstraat",
  companyHouseNumber: "123",
  companyPostalCode: "1234 AB",
  companyCity: "Amsterdam",
  companyCountry: "Nederland",
  companyPhone: "+31 20 123 4567",
  companyEmail: "info@partyaccessoires.nl",
  companyWebsite: "www.partyaccessoires.nl",
  companyKvk: "12345678",
  companyBtw: "NL123456789B01",
  companyIban: "NL00 BANK 0000 0000 00",
  companyBic: "BANKBIC",
  logoUrl: undefined,
  watermarkUrl: undefined,
  primaryColor: "#ec4899",
  secondaryColor: "#1a1a1a",
  accentColor: "#059669",
  showLogo: true,
  showWatermark: false,
  showCompanyDetails: true,
  showKvk: true,
  showBtw: true,
  showIban: true,
  showPaymentSection: true,
  showProductImages: true,
  showProductDescriptions: true,
  showThankYouMessage: true,
  invoicePrefix: "INV",
  paymentTermsDays: 14,
  defaultBtwPercentage: 21,
  thankYouMessageNl: "Bedankt voor uw bestelling!",
  thankYouMessageEn: "Thank you for your order!",
  thankYouMessagePl: "Dziękujemy za zamówienie!",
  footerText: undefined,
});
