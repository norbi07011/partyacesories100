import { supabase } from "./supabaseClient";
import {
  Invoice,
  InvoiceItem,
  BillingAddress,
  Booking,
  CartItem,
} from "../types";

const isSupabaseReady = (): boolean => !!supabase;

// Database invoice type
interface DBInvoice {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  billing_company: string | null;
  billing_kvk: string | null;
  billing_btw: string | null;
  billing_street: string | null;
  billing_house_number: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_country: string | null;
  amount: number;
  subtotal: number | null;
  btw_amount: number | null;
  btw_percentage: number | null;
  invoice_date: string;
  due_date: string | null;
  paid_date: string | null;
  status: "paid" | "unpaid";
  payment_method: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface DBInvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string | null;
  product_name: string;
  product_description: string | null;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

// Convert DB to frontend type
const mapDBInvoiceToInvoice = (
  dbInvoice: DBInvoice,
  items: InvoiceItem[] = []
): Invoice => {
  const billingAddress: BillingAddress | undefined = dbInvoice.billing_street
    ? {
        company: dbInvoice.billing_company || undefined,
        kvk: dbInvoice.billing_kvk || undefined,
        btw: dbInvoice.billing_btw || undefined,
        street: dbInvoice.billing_street,
        houseNumber: dbInvoice.billing_house_number || "",
        postalCode: dbInvoice.billing_postal_code || "",
        city: dbInvoice.billing_city || "",
        country: dbInvoice.billing_country || "Nederland",
      }
    : undefined;

  return {
    id: dbInvoice.id,
    invoiceNumber: dbInvoice.invoice_number,
    bookingId: dbInvoice.booking_id || undefined,
    customerName: dbInvoice.customer_name,
    customerEmail: dbInvoice.customer_email || undefined,
    customerPhone: dbInvoice.customer_phone || undefined,
    billingAddress,
    items,
    subtotal: Number(dbInvoice.subtotal) || Number(dbInvoice.amount) / 1.21,
    btwAmount:
      Number(dbInvoice.btw_amount) ||
      Number(dbInvoice.amount) - Number(dbInvoice.amount) / 1.21,
    btwPercentage: Number(dbInvoice.btw_percentage) || 21,
    amount: Number(dbInvoice.amount),
    date: dbInvoice.invoice_date,
    dueDate: dbInvoice.due_date || undefined,
    paidDate: dbInvoice.paid_date || undefined,
    status: dbInvoice.status,
    paymentMethod: dbInvoice.payment_method || undefined,
    description: dbInvoice.description || undefined,
  };
};

const mapDBItemToInvoiceItem = (dbItem: DBInvoiceItem): InvoiceItem => ({
  id: dbItem.id,
  productId: dbItem.product_id || undefined,
  productName: dbItem.product_name,
  productDescription: dbItem.product_description || undefined,
  productImage: dbItem.product_image || undefined,
  quantity: dbItem.quantity,
  unitPrice: Number(dbItem.unit_price),
  lineTotal: Number(dbItem.line_total),
});

// Fetch all invoices with items
export const fetchInvoices = async (): Promise<Invoice[]> => {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invoices:", error);
    throw error;
  }

  return (data as DBInvoice[]).map((inv) => mapDBInvoiceToInvoice(inv));
};

// Fetch single invoice with items
export const fetchInvoiceById = async (id: string): Promise<Invoice | null> => {
  if (!isSupabaseReady()) return null;
  const { data: invoiceData, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (invoiceError) {
    console.error("Error fetching invoice:", invoiceError);
    return null;
  }

  // Fetch invoice items
  const { data: itemsData } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", id);

  const items = ((itemsData as DBInvoiceItem[]) || []).map(
    mapDBItemToInvoiceItem
  );

  return mapDBInvoiceToInvoice(invoiceData as DBInvoice, items);
};

// Fetch invoice by invoice number
export const fetchInvoiceByNumber = async (
  invoiceNumber: string
): Promise<Invoice | null> => {
  if (!isSupabaseReady()) return null;
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("invoice_number", invoiceNumber)
    .single();

  if (error) {
    console.error("Error fetching invoice by number:", error);
    return null;
  }

  // Fetch items
  const { data: itemsData } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", data.id);

  const items = ((itemsData as DBInvoiceItem[]) || []).map(
    mapDBItemToInvoiceItem
  );

  return mapDBInvoiceToInvoice(data as DBInvoice, items);
};

// Create invoice from booking
export const createInvoiceFromBooking = async (
  booking: Booking,
  lang: "nl" | "en" | "pl" = "nl"
): Promise<Invoice> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  // Calculate due date (14 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  // Prepare invoice data
  const invoiceData: Record<string, any> = {
    booking_id: booking.id,
    customer_name: booking.customerName,
    customer_email: booking.customerEmail,
    customer_phone: booking.customerPhone || null,
    amount: booking.total,
    subtotal: booking.subtotal,
    btw_amount: booking.btwAmount,
    btw_percentage: booking.btwPercentage,
    status: "unpaid",
    due_date: dueDate.toISOString().split("T")[0],
  };

  // Add billing address if available
  if (booking.billingAddress) {
    invoiceData.billing_company = booking.billingAddress.company || null;
    invoiceData.billing_kvk = booking.billingAddress.kvk || null;
    invoiceData.billing_btw = booking.billingAddress.btw || null;
    invoiceData.billing_street = booking.billingAddress.street;
    invoiceData.billing_house_number = booking.billingAddress.houseNumber;
    invoiceData.billing_postal_code = booking.billingAddress.postalCode;
    invoiceData.billing_city = booking.billingAddress.city;
    invoiceData.billing_country = booking.billingAddress.country;
  }

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert([invoiceData])
    .select()
    .single();

  if (invoiceError) {
    console.error("Error creating invoice:", invoiceError);
    throw invoiceError;
  }

  // Fetch booking items from database with product details
  const { data: bookingItemsData, error: bookingItemsError } = await supabase
    .from("booking_items")
    .select(
      `
      id,
      quantity,
      price_at_time,
      product_id,
      selected_size,
      selected_letters,
      products (
        id,
        name_nl,
        name_en,
        name_pl,
        description_nl,
        description_en,
        description_pl,
        price,
        image_url,
        images
      )
    `
    )
    .eq("booking_id", booking.id);

  if (bookingItemsError) {
    console.error("Error fetching booking items:", bookingItemsError);
  }

  // Insert invoice items from booking items
  if (bookingItemsData && bookingItemsData.length > 0) {
    const invoiceItems = bookingItemsData.map((item: any) => {
      const product = item.products;
      const productName =
        lang === "nl"
          ? product.name_nl
          : lang === "en"
          ? product.name_en
          : product.name_pl;
      const productDesc =
        lang === "nl"
          ? product.description_nl
          : lang === "en"
          ? product.description_en
          : product.description_pl;

      // Add selected options to description
      let enhancedDesc = productDesc || "";
      if (item.selected_size) {
        enhancedDesc += enhancedDesc ? `\n📐 Rozmiar: ${item.selected_size}` : `📐 Rozmiar: ${item.selected_size}`;
      }
      if (item.selected_letters) {
        enhancedDesc += enhancedDesc ? `\n✨ Litery: "${item.selected_letters}"` : `✨ Litery: "${item.selected_letters}"`;
      }

      // Use images array if available, fallback to image_url
      let productImage = product.image_url || "";
      if (
        product.images &&
        Array.isArray(product.images) &&
        product.images.length > 0
      ) {
        productImage = product.images[0];
      }

      return {
        invoice_id: invoice.id,
        product_id: item.product_id,
        product_name: productName,
        product_description: enhancedDesc,
        product_image: productImage,
        quantity: item.quantity,
        unit_price: Number(item.price_at_time),
        line_total: Number(item.price_at_time) * item.quantity,
      };
    });

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
    }
  }

  // Fetch created invoice with items
  return (await fetchInvoiceById(invoice.id)) as Invoice;
};

// Create manual invoice (without booking)
export const createManualInvoice = async (
  customerName: string,
  customerEmail: string,
  customerPhone: string | undefined,
  billingAddress: BillingAddress,
  items: {
    name: string;
    description?: string;
    image?: string;
    quantity: number;
    unitPrice: number;
  }[],
  btwPercentage: number = 21
): Promise<Invoice> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  // Calculate totals
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const btwAmount = subtotal * (btwPercentage / 100);
  const total = subtotal + btwAmount;

  // Calculate due date (14 days)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const invoiceData = {
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone || null,
    billing_company: billingAddress.company || null,
    billing_kvk: billingAddress.kvk || null,
    billing_btw: billingAddress.btw || null,
    billing_street: billingAddress.street,
    billing_house_number: billingAddress.houseNumber,
    billing_postal_code: billingAddress.postalCode,
    billing_city: billingAddress.city,
    billing_country: billingAddress.country || "Nederland",
    amount: total,
    subtotal: subtotal,
    btw_amount: btwAmount,
    btw_percentage: btwPercentage,
    status: "unpaid",
    due_date: dueDate.toISOString().split("T")[0],
  };

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert([invoiceData])
    .select()
    .single();

  if (invoiceError) {
    console.error("Error creating manual invoice:", invoiceError);
    throw invoiceError;
  }

  // Insert items
  const invoiceItems = items.map((item) => ({
    invoice_id: invoice.id,
    product_name: item.name,
    product_description: item.description || null,
    product_image: item.image || null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.unitPrice * item.quantity,
  }));

  await supabase.from("invoice_items").insert(invoiceItems);

  return (await fetchInvoiceById(invoice.id)) as Invoice;
};

// Update invoice status
export const updateInvoiceStatus = async (
  id: string,
  status: "paid" | "unpaid",
  paymentMethod?: string
): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const updateData: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "paid") {
    updateData.paid_date = new Date().toISOString().split("T")[0];
  }

  if (paymentMethod) {
    updateData.payment_method = paymentMethod;
  }

  const { error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating invoice status:", error);
    throw error;
  }
};

// Delete invoice
export const deleteInvoice = async (id: string): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { error } = await supabase.from("invoices").delete().eq("id", id);

  if (error) {
    console.error("Error deleting invoice:", error);
    throw error;
  }
};

// Calculate total revenue from paid invoices
export const calculateTotalRevenue = async (): Promise<number> => {
  if (!isSupabaseReady()) return 0;
  const { data, error } = await supabase
    .from("invoices")
    .select("amount")
    .eq("status", "paid");

  if (error) {
    console.error("Error calculating total revenue:", error);
    throw error;
  }

  return data?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0;
};

// Company details for invoice header
export const COMPANY_DETAILS = {
  name: "Party Accessoires Verhuur",
  street: "Partystraat 123",
  houseNumber: "45",
  postalCode: "2500 AB",
  city: "Den Haag",
  country: "Nederland",
  phone: "+31 6 12345678",
  email: "info@partyaccessoiresverhuur.nl",
  website: "www.partyaccessoiresverhuur.nl",
  kvk: "12345678",
  btw: "NL123456789B01",
  iban: "NL00 BANK 0123 4567 89",
  bic: "BANKBIC2",
};
