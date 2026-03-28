import { supabase, checkSupabaseConnection, isSupabaseAvailable } from "./supabaseClient";

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  product_id?: string;
  user_id?: string;
  session_id?: string;
  metadata?: any;
  user_agent?: string;
  ip_address?: string;
  country?: string;
  city?: string;
  created_at: string;
}

export interface DetailedProductView {
  product_id: string;
  product_name: string;
  product_category: string;
  total_views: number;
  unique_sessions: number;
  last_viewed_at: string;
  avg_views_per_session: number;
}

export interface RecentView {
  id: number;
  product_id: string;
  product_name: string;
  session_id: string;
  event_type: string;
  created_at: string;
  user_agent?: string;
  ip_address?: string;
  country?: string;
  city?: string;
}

export interface SessionView {
  session_id: string;
  total_views: number;
  unique_products: number;
  first_view: string;
  last_view: string;
  country?: string;
  city?: string;
}

export interface ProductStats {
  product_id: string;
  product_name: string;
  views: number;
  purchases: number;
  revenue: number;
}

export interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  pendingBookings: number;
  totalProducts: number;
  totalViews: number;
  conversionRate: number;
}

// Get user location and details (simplified - no external API calls)
const getUserDetails = async () => {
  return {
    user_agent: navigator.userAgent,
    ip_address: null,
    country: null,
    city: null,
  };
};

// Track event with detailed information
export const trackEvent = async (
  eventType: string,
  productId?: string,
  metadata?: any
): Promise<void> => {
  // Skip if Supabase is not available
  if (isSupabaseAvailable() === false) {
    return;
  }

  try {
    const sessionId = getSessionId();
    const userDetails = await getUserDetails();

    await supabase.from("analytics_events").insert({
      event_type: eventType,
      product_id: productId || null,
      session_id: sessionId,
      metadata: metadata || null,
      user_agent: userDetails.user_agent,
      ip_address: userDetails.ip_address,
      country: userDetails.country,
      city: userDetails.city,
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
  }
};

// Get or create session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("analytics_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    sessionStorage.setItem("analytics_session_id", sessionId);
  }
  return sessionId;
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  if (!isSupabaseAvailable()) {
    return { totalBookings: 0, totalRevenue: 0, pendingBookings: 0, totalProducts: 0, totalViews: 0, conversionRate: 0 };
  }
  try {
    // Total bookings
    const { count: totalBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    // Pending bookings
    const { count: pendingBookings } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Total revenue
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("total")
      .eq("payment_status", "paid");

    const totalRevenue =
      bookingsData?.reduce((sum, b) => sum + Number(b.total || 0), 0) || 0;

    // Total products
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    // Total views
    const { count: totalViews } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "product_view");

    // Conversion rate
    const { count: productClicks } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .in("event_type", ["product_view", "product_click"]);

    const conversionRate =
      productClicks && totalBookings
        ? (totalBookings / productClicks) * 100
        : 0;

    return {
      totalBookings: totalBookings || 0,
      totalRevenue,
      pendingBookings: pendingBookings || 0,
      totalProducts: totalProducts || 0,
      totalViews: totalViews || 0,
      conversionRate,
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalBookings: 0,
      totalRevenue: 0,
      pendingBookings: 0,
      totalProducts: 0,
      totalViews: 0,
      conversionRate: 0,
    };
  }
};

// Get top viewed products
export const getTopViewedProducts = async (
  limit: number = 10
): Promise<Array<{ id: string; name: string; views: number }>> => {
  try {
    const { data, error } = await supabase.rpc("get_top_viewed_products", {
      limit_count: limit,
    });

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching top viewed products:", error);
    return [];
  }
};

// Get top purchased products
export const getTopPurchasedProducts = async (
  limit: number = 10
): Promise<Array<{ id: string; name: string; purchases: number }>> => {
  try {
    const { data, error } = await supabase.rpc("get_top_purchased_products", {
      limit_count: limit,
    });

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching top purchased products:", error);
    return [];
  }
};

// Get revenue over time (last 30 days)
export const getRevenueOverTime = async (
  days: number = 30
): Promise<{ date: string; revenue: number }[]> => {
  try {
    const { data, error } = await supabase.rpc("get_revenue_over_time", {
      days: days,
    });

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return (data || []).map((d: any) => ({
      date: d.date,
      revenue: Number(d.revenue) || 0,
    }));
  } catch (error) {
    console.error("Error fetching revenue over time:", error);
    return [];
  }
};

// Get category statistics
export const getCategoryStats = async (): Promise<
  { category: string; count: number }[]
> => {
  try {
    const { data, error } = await supabase.rpc("get_category_stats");

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return (data || []).map((d: any) => ({
      category: d.category,
      count: Number(d.count) || 0,
    }));
  } catch (error) {
    console.error("Error fetching category stats:", error);
    return [];
  }
};

// Get detailed product views with session statistics
export const getDetailedProductViews = async (): Promise<
  DetailedProductView[]
> => {
  try {
    const { data, error } = await supabase.rpc("get_detailed_product_views");

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return (data || []).map((d: any) => ({
      product_id: d.product_id,
      product_name: d.product_name,
      product_category: d.product_category,
      total_views: Number(d.total_views) || 0,
      unique_sessions: Number(d.unique_sessions) || 0,
      last_viewed_at: d.last_viewed_at,
      avg_views_per_session: Number(d.avg_views_per_session) || 0,
    }));
  } catch (error) {
    console.error("Error fetching detailed product views:", error);
    return [];
  }
};

// Get recent product views
export const getRecentProductViews = async (
  limit: number = 50
): Promise<RecentView[]> => {
  try {
    const { data, error } = await supabase.rpc("get_recent_product_views", {
      limit_count: limit,
    });

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching recent product views:", error);
    return [];
  }
};

// Get views grouped by session
export const getViewsBySession = async (): Promise<SessionView[]> => {
  try {
    const { data, error } = await supabase.rpc("get_views_by_session");

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching views by session:", error);
    return [];
  }
};
