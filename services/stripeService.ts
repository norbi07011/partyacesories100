import { loadStripe, Stripe } from "@stripe/stripe-js";
import { CartItem, CustomerDetails } from "../types";
import { supabase } from "./supabaseClient";

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("Stripe publishable key not found");
      return null;
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
};

export interface CheckoutSessionData {
  customerEmail: string;
  customerName: string;
  items: CartItem[];
  bookingDate: string;
  notes?: string;
  customerDetails?: CustomerDetails;
}

export const createCheckoutSession = async (
  data: CheckoutSessionData
): Promise<{ sessionId: string; url: string } | null> => {
  try {
    // Call Supabase Edge Function
    const { data: session, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: data,
      }
    );

    if (error) {
      console.error("Error from edge function:", error);
      throw error;
    }

    return session;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return null;
  }
};

export const redirectToCheckout = async (sessionId: string) => {
  const stripe = await getStripe();
  if (!stripe) {
    console.error("Stripe not initialized");
    return { error: "Stripe not initialized" };
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });

  if (error) {
    console.error("Error redirecting to checkout:", error);
  }

  return { error };
};

export const processPayment = async (
  data: CheckoutSessionData
): Promise<boolean> => {
  try {
    // Create checkout session
    const session = await createCheckoutSession(data);

    if (!session || !session.url) {
      throw new Error("Failed to create checkout session");
    }

    // Redirect to Stripe Checkout
    window.location.href = session.url;
    return true;
  } catch (error) {
    console.error("Error processing payment:", error);
    return false;
  }
};
