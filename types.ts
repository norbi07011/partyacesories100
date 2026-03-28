export type Language = "nl" | "en" | "pl";

export interface Product {
  id: string;
  name: {
    nl: string;
    en: string;
    pl: string;
  };
  description: {
    nl: string;
    en: string;
    pl: string;
  };
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category: string;
  address?: string;
  contactLink?: string;
  customPriceText?: {
    nl: string;
    en: string;
    pl: string;
  };
  comingSoon?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string; // e.g., "5m x 7m" or "6m x 6m"
  selectedLetters?: string; // e.g., "PARTY" or "LOVE"
}

export interface BillingAddress {
  company?: string;
  kvk?: string; // Dutch Chamber of Commerce number
  btw?: string; // Dutch VAT number
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
  billingAddress: BillingAddress;
  deliveryAddress?: BillingAddress;
  deliverySameAsBilling: boolean;
}

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  date: string;
  status: "pending" | "confirmed" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  items: CartItem[];
  subtotal: number;
  btwAmount: number;
  btwPercentage: number;
  total: number;
  billingAddress?: BillingAddress;
  deliveryAddress?: BillingAddress;
  deliverySameAsBilling?: boolean;
  stripePaymentId?: string;
  createdAt: string;
}

export interface DayOverride {
  date: string;
  status: "available" | "partial" | "blocked";
  note?: string;
}

export interface InvoiceItem {
  id?: string;
  productId?: string;
  productName: string;
  productDescription?: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: BillingAddress;
  items: InvoiceItem[];
  subtotal: number;
  btwAmount: number;
  btwPercentage: number;
  amount: number; // total
  date: string;
  dueDate?: string;
  paidDate?: string;
  status: "paid" | "unpaid";
  paymentMethod?: string;
  description?: string;
}

export interface Translation {
  [key: string]: {
    nl: string;
    en: string;
    pl: string;
  };
}

export interface InvoiceSettings {
  id: string;
  // Company Info
  companyName: string;
  companyStreet: string;
  companyHouseNumber: string;
  companyPostalCode: string;
  companyCity: string;
  companyCountry: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyKvk: string;
  companyBtw: string;
  companyIban: string;
  companyBic: string;

  // Branding
  logoUrl?: string;
  watermarkUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Visibility Settings
  showLogo: boolean;
  showWatermark: boolean;
  showCompanyDetails: boolean;
  showKvk: boolean;
  showBtw: boolean;
  showIban: boolean;
  showPaymentSection: boolean;
  showProductImages: boolean;
  showProductDescriptions: boolean;
  showThankYouMessage: boolean;

  // Invoice Settings
  invoicePrefix: string;
  paymentTermsDays: number;
  defaultBtwPercentage: number;
  thankYouMessageNl: string;
  thankYouMessageEn: string;
  thankYouMessagePl: string;
  footerText?: string;
}
