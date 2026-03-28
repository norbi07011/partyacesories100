import { supabase } from "./supabaseClient";
import { Booking, CartItem, BillingAddress, CustomerDetails } from "../types";

const isSupabaseReady = (): boolean => !!supabase;

// Database booking type
interface DBBooking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  booking_date: string;
  status: "pending" | "confirmed" | "cancelled";
  payment_status: "pending" | "paid" | "refunded";
  total: number;
  subtotal: number | null;
  btw_amount: number | null;
  btw_percentage: number | null;
  billing_company: string | null;
  billing_kvk: string | null;
  billing_btw: string | null;
  billing_street: string | null;
  billing_house_number: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_country: string | null;
  delivery_street: string | null;
  delivery_house_number: string | null;
  delivery_postal_code: string | null;
  delivery_city: string | null;
  delivery_country: string | null;
  delivery_same_as_billing: boolean;
  stripe_payment_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Convert DB booking to frontend Booking type
const mapDBBookingToBooking = (
  dbBooking: DBBooking,
  items?: CartItem[]
): Booking => {
  const billingAddress: BillingAddress | undefined = dbBooking.billing_street
    ? {
        company: dbBooking.billing_company || undefined,
        kvk: dbBooking.billing_kvk || undefined,
        btw: dbBooking.billing_btw || undefined,
        street: dbBooking.billing_street,
        houseNumber: dbBooking.billing_house_number || "",
        postalCode: dbBooking.billing_postal_code || "",
        city: dbBooking.billing_city || "",
        country: dbBooking.billing_country || "Nederland",
      }
    : undefined;

  const deliveryAddress: BillingAddress | undefined =
    !dbBooking.delivery_same_as_billing && dbBooking.delivery_street
      ? {
          street: dbBooking.delivery_street,
          houseNumber: dbBooking.delivery_house_number || "",
          postalCode: dbBooking.delivery_postal_code || "",
          city: dbBooking.delivery_city || "",
          country: dbBooking.delivery_country || "Nederland",
        }
      : undefined;

  return {
    id: dbBooking.id,
    customerName: dbBooking.customer_name,
    customerEmail: dbBooking.customer_email,
    customerPhone: dbBooking.customer_phone || undefined,
    date: dbBooking.booking_date,
    status: dbBooking.status,
    paymentStatus: dbBooking.payment_status || "pending",
    total: Number(dbBooking.total),
    subtotal: Number(dbBooking.subtotal) || Number(dbBooking.total) / 1.21,
    btwAmount:
      Number(dbBooking.btw_amount) ||
      Number(dbBooking.total) - Number(dbBooking.total) / 1.21,
    btwPercentage: Number(dbBooking.btw_percentage) || 21,
    items: items || [],
    billingAddress,
    deliveryAddress,
    deliverySameAsBilling: dbBooking.delivery_same_as_billing,
    stripePaymentId: dbBooking.stripe_payment_id || undefined,
    createdAt: dbBooking.created_at,
  };
};

// Fetch all bookings
export const fetchBookings = async (): Promise<Booking[]> => {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bookings:", error);
    throw error;
  }

  return (data as DBBooking[]).map((b) => mapDBBookingToBooking(b));
};

// Fetch single booking with items
export const fetchBookingById = async (id: string): Promise<Booking | null> => {
  if (!isSupabaseReady()) return null;
  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (bookingError) {
    console.error("Error fetching booking:", bookingError);
    return null;
  }

  // Fetch booking items with product details
  const { data: itemsData } = await supabase
    .from("booking_items")
    .select(
      `
      id,
      quantity,
      price_at_time,
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
        category
      )
    `
    )
    .eq("booking_id", id);

  const items: CartItem[] = (itemsData || []).map((item: any) => ({
    product: {
      id: item.products.id,
      name: {
        nl: item.products.name_nl,
        en: item.products.name_en,
        pl: item.products.name_pl,
      },
      description: {
        nl: item.products.description_nl,
        en: item.products.description_en,
        pl: item.products.description_pl,
      },
      price: item.price_at_time,
      image: item.products.image_url,
      category: item.products.category,
    },
    quantity: item.quantity,
    selectedSize: item.selected_size || undefined,
    selectedLetters: item.selected_letters || undefined,
  }));

  return mapDBBookingToBooking(bookingData as DBBooking, items);
};

// Fetch bookings by date
export const fetchBookingsByDate = async (date: string): Promise<Booking[]> => {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_date", date)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching bookings by date:", error);
    throw error;
  }

  return (data as DBBooking[]).map((b) => mapDBBookingToBooking(b));
};

// Fetch booked dates (for calendar)
export const fetchBookedDates = async (): Promise<string[]> => {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_date")
    .neq("status", "cancelled");

  if (error) {
    console.error("Error fetching booked dates:", error);
    throw error;
  }

  return [
    ...new Set((data as { booking_date: string }[]).map((b) => b.booking_date)),
  ];
};

// Calculate BTW (Dutch VAT) - prices are BRUTTO (including BTW)
// This function extracts BTW from the total price
export const calculateBTW = (
  bruttoTotal: number,
  btwPercentage: number = 21
): { subtotal: number; btwAmount: number; total: number } => {
  // Extract BTW from brutto price: netto = brutto / 1.21
  const subtotal = bruttoTotal / (1 + btwPercentage / 100);
  const btwAmount = bruttoTotal - subtotal;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    btwAmount: Math.round(btwAmount * 100) / 100,
    total: bruttoTotal,
  };
};

// Create new booking with full customer details
export const createBookingWithDetails = async (
  customer: CustomerDetails,
  date: string,
  items: CartItem[],
  notes?: string
): Promise<Booking> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  // Calculate totals - prices are already BRUTTO (including BTW)
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const btwPercentage = 21;
  const { subtotal, btwAmount } = calculateBTW(total, btwPercentage);

  // Prepare booking data
  const bookingData: Record<string, any> = {
    customer_name: customer.name,
    customer_email: customer.email,
    customer_phone: customer.phone || null,
    booking_date: date,
    total: total,
    subtotal: subtotal,
    btw_amount: btwAmount,
    btw_percentage: btwPercentage,
    status: "pending",
    payment_status: "pending",
    billing_company: customer.billingAddress.company || null,
    billing_kvk: customer.billingAddress.kvk || null,
    billing_btw: customer.billingAddress.btw || null,
    billing_street: customer.billingAddress.street,
    billing_house_number: customer.billingAddress.houseNumber,
    billing_postal_code: customer.billingAddress.postalCode,
    billing_city: customer.billingAddress.city,
    billing_country: customer.billingAddress.country || "Nederland",
    delivery_same_as_billing: customer.deliverySameAsBilling,
    notes: notes || null,
  };

  // Add delivery address if different from billing
  if (!customer.deliverySameAsBilling && customer.deliveryAddress) {
    bookingData.delivery_street = customer.deliveryAddress.street;
    bookingData.delivery_house_number = customer.deliveryAddress.houseNumber;
    bookingData.delivery_postal_code = customer.deliveryAddress.postalCode;
    bookingData.delivery_city = customer.deliveryAddress.city;
    bookingData.delivery_country =
      customer.deliveryAddress.country || "Nederland";
  }

  // Insert booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert([bookingData])
    .select()
    .single();

  if (bookingError) {
    console.error("Error creating booking:", bookingError);
    throw bookingError;
  }

  // Insert booking items
  const bookingItems = items.map((item) => ({
    booking_id: booking.id,
    product_id: item.product.id,
    quantity: item.quantity,
    price_at_time: item.product.price,
    selected_size: item.selectedSize || null,
    selected_letters: item.selectedLetters || null,
  }));

  const { error: itemsError } = await supabase
    .from("booking_items")
    .insert(bookingItems);

  if (itemsError) {
    console.error("Error creating booking items:", itemsError);
  }

  return mapDBBookingToBooking(booking as DBBooking, items);
};

// Simple create booking (backward compatible)
export const createBooking = async (
  customerName: string,
  customerEmail: string,
  date: string,
  items: CartItem[],
  total: number
): Promise<Booking> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const subtotal = total / 1.21;
  const btwAmount = total - subtotal;

  const { data: bookingData, error: bookingError } = await supabase
    .from("bookings")
    .insert([
      {
        customer_name: customerName,
        customer_email: customerEmail,
        booking_date: date,
        total: total,
        subtotal: subtotal,
        btw_amount: btwAmount,
        btw_percentage: 21,
        status: "pending",
        payment_status: "pending",
      },
    ])
    .select()
    .single();

  if (bookingError) {
    console.error("Error creating booking:", bookingError);
    throw bookingError;
  }

  const booking = bookingData as DBBooking;

  // Insert booking items if provided
  if (items.length > 0) {
    const bookingItems = items.map((item) => ({
      booking_id: booking.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_time: item.product.price,
      selected_size: item.selectedSize || null,
      selected_letters: item.selectedLetters || null,
    }));

    await supabase.from("booking_items").insert(bookingItems);
  }

  return mapDBBookingToBooking(booking, items);
};

// Update booking status
export const updateBookingStatus = async (
  id: string,
  status: "pending" | "confirmed" | "cancelled"
): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Error updating booking status:", error);
    throw error;
  }
};

// Update payment status
export const updatePaymentStatus = async (
  id: string,
  paymentStatus: "pending" | "paid" | "refunded",
  stripePaymentId?: string
): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const updateData: Record<string, any> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };

  if (stripePaymentId) {
    updateData.stripe_payment_id = stripePaymentId;
  }

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", id);

  if (error) {
    console.error("Error updating payment status:", error);
    throw error;
  }
};

// Delete booking
export const deleteBooking = async (id: string): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) {
    console.error("Error deleting booking:", error);
    throw error;
  }
};

// Fetch booked dates for a specific product
export const fetchBookedDatesForProduct = async (
  productId: string
): Promise<string[]> => {
  try {
    console.log("Fetching booked dates for product:", productId);

    // First get all booking_items for this product
    const { data: bookingItems, error: itemsError } = await supabase
      .from("booking_items")
      .select("booking_id")
      .eq("product_id", productId);

    if (itemsError) {
      console.error("Error fetching booking items:", itemsError);
      return [];
    }

    console.log("Booking items found:", bookingItems);

    if (!bookingItems || bookingItems.length === 0) {
      console.log("No booking items found for product:", productId);
      return [];
    }

    // Get unique booking IDs
    const bookingIds = [
      ...new Set(bookingItems.map((item) => item.booking_id)),
    ];
    console.log("Booking IDs:", bookingIds);

    // Fetch bookings with these IDs that are pending or confirmed
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("booking_date, status")
      .in("id", bookingIds);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return [];
    }

    console.log("Bookings found:", bookings);

    // Filter for pending/confirmed and extract unique dates
    const dates =
      bookings
        ?.filter((b) => b.status === "pending" || b.status === "confirmed")
        .map((b) => b.booking_date)
        .filter((date, index, self) => self.indexOf(date) === index) || [];

    console.log("Booked dates for product:", dates);
    return dates;
  } catch (error) {
    console.error("Error in fetchBookedDatesForProduct:", error);
    return [];
  }
};
