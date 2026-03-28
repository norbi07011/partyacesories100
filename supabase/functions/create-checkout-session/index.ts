import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const origin = req.headers.get("origin") || "https://partyaccessoiresverhuur.nl";
    
    console.log("Received body:", JSON.stringify(body));
    console.log("Origin:", origin);
    
    const {
      customerEmail,
      customerName,
      items,
      bookingDate,
      notes,
      customerDetails,
    } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Items array is required and must not be empty");
    }
    if (!customerEmail) {
      throw new Error("Customer email is required");
    }

    console.log("Processing items:", items.length);

    // Helper to get full image URL (Stripe requires HTTPS URLs)
    const getFullImageUrl = (imagePath: string | undefined): string | null => {
      if (!imagePath) return null;
      if (imagePath.startsWith("http")) return imagePath;
      // Convert local path to full URL
      return `${origin}${imagePath}`;
    };

    // Calculate total amount
    const lineItems = items.map((item: any) => {
      const name = item.product?.name?.nl || item.product?.name || "Product";
      const description = item.product?.description?.nl || item.product?.description || "";
      const price = item.product?.price || 0;
      const imageUrl = getFullImageUrl(item.product?.image);
      
      console.log("Line item:", { name, price, quantity: item.quantity, imageUrl });
      
      // Build product_data without images if not available
      const productData: any = { name };
      if (description) productData.description = description;
      // Only add images if it's a valid HTTPS URL
      if (imageUrl && imageUrl.startsWith("https://")) {
        productData.images = [imageUrl];
      }
      
      return {
        price_data: {
          currency: "eur",
          product_data: productData,
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: item.quantity || 1,
      };
    });

    // Prepare items data for metadata (to create booking_items in webhook)
    // Keep only essential data to stay within Stripe's 500 char limit per field
    const itemsData = items.map((item: any) => ({
      id: item.product?.id || "",
      q: item.quantity || 1,
      p: item.product?.price || 0,
      sz: item.selectedSize || null,
      lt: item.selectedLetters || null,
    }));

    // Stringify and check length - Stripe metadata values have 500 char limit
    let itemsDataStr = JSON.stringify(itemsData);
    console.log("Items data string length:", itemsDataStr.length);
    console.log("Items data:", itemsDataStr);
    
    if (itemsDataStr.length > 490) {
      // If too long, store only product IDs and quantities (without extra data)
      itemsDataStr = JSON.stringify(items.map((item: any) => ({
        id: item.product?.id || "",
        q: item.quantity || 1,
        p: item.product?.price || 0,
      })));
      console.log("Truncated items data:", itemsDataStr);
    }

    // Create Stripe Checkout Session with iDEAL support
    // Use /#/ for HashRouter compatibility
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"], // Enable card and iDEAL
      line_items: lineItems,
      mode: "payment",
      customer_email: customerEmail,
      success_url: `${origin}/#/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/cancel`,
      metadata: {
        customer_name: customerName || "",
        booking_date: bookingDate || "",
        notes: notes || "",
        customer_details: JSON.stringify(customerDetails || {}),
        items_data: itemsDataStr,
      },
      locale: "nl", // Set Dutch locale for iDEAL
      billing_address_collection: "required",
    });

    console.log("Session created:", session.id);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
