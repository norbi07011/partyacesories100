import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  console.log("Webhook called - signature present:", !!signature);
  console.log("Webhook secret configured:", !!webhookSecret);

  if (!signature || !webhookSecret) {
    console.error("Missing signature or webhook secret - signature:", !!signature, "secret:", !!webhookSecret);
    return new Response(JSON.stringify({ error: "Missing signature or webhook secret" }), { 
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.text();
    console.log("Received body length:", body.length);
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("Signature verification failed:", err instanceof Error ? err.message : err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    console.log("Event type:", event.type);

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract metadata
      const metadata = session.metadata || {};
      console.log("Full metadata:", JSON.stringify(metadata));
      
      const customerDetails = JSON.parse(metadata.customer_details || "{}");
      
      // Parse items_data - handle both old and new format
      let itemsData: any[] = [];
      try {
        itemsData = JSON.parse(metadata.items_data || "[]");
        console.log("Parsed items_data:", JSON.stringify(itemsData));
      } catch (e) {
        console.error("Failed to parse items_data:", e);
      }

      console.log("Processing checkout session:", session.id);
      console.log("Items data count:", itemsData.length);

      // Create booking in database
      // Calculate BTW (21% Dutch VAT) - prices are inclusive of BTW
      const totalAmount = (session.amount_total || 0) / 100;
      const btwPercentage = 21;
      const subtotalAmount = Math.round((totalAmount / 1.21) * 100) / 100;
      const btwAmount = Math.round((totalAmount - subtotalAmount) * 100) / 100;

      console.log("BTW calculation:", { totalAmount, subtotalAmount, btwAmount, btwPercentage });

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          customer_name: metadata.customer_name,
          customer_email: session.customer_email,
          customer_phone: customerDetails.phone || null,
          booking_date: metadata.booking_date,
          status: "confirmed",
          payment_status: "paid",
          payment_method: "stripe",
          stripe_payment_id: session.payment_intent as string,
          total: totalAmount,
          subtotal: subtotalAmount,
          btw_amount: btwAmount,
          btw_percentage: btwPercentage,
          notes: metadata.notes || null,
          billing_street: customerDetails.billing_street || null,
          billing_house_number: customerDetails.billing_house_number || null,
          billing_postal_code: customerDetails.billing_postal_code || null,
          billing_city: customerDetails.billing_city || null,
          billing_country: customerDetails.billing_country || "Nederland",
        })
        .select()
        .single();

      if (bookingError) {
        console.error("Error creating booking:", bookingError);
        throw bookingError;
      }

      console.log("Booking created successfully:", booking.id);

      // Create booking_items from items_data
      if (itemsData && itemsData.length > 0) {
        console.log("Creating booking items from metadata:", itemsData.length);
        const bookingItems = itemsData.map((item: any) => ({
          booking_id: booking.id,
          product_id: item.id || item.product_id,
          quantity: item.q || item.quantity,
          price_at_time: item.p || item.price,
          selected_size: item.sz || item.selectedSize || null,
        }));

        console.log("Booking items to insert:", JSON.stringify(bookingItems));

        const { error: itemsError } = await supabase
          .from("booking_items")
          .insert(bookingItems);

        if (itemsError) {
          console.error("Error creating booking items:", itemsError);
        } else {
          console.log(
            "Booking items created successfully:",
            bookingItems.length
          );
        }
      } else {
        console.log("No items_data in metadata, trying to get from line_items");
        
        // Fallback: retrieve line_items from Stripe session
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          console.log("Line items from Stripe:", lineItems.data.length);
          
          if (lineItems.data.length > 0) {
            // We can't get product_id from Stripe line_items directly
            // Log for debugging
            console.log("Line items data:", JSON.stringify(lineItems.data));
          }
        } catch (e) {
          console.error("Error fetching line items:", e);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
