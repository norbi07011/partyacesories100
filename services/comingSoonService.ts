import { supabase, checkSupabaseConnection } from "./supabaseClient";
import { Product } from "../types";
import { LOCAL_COMING_SOON_PRODUCTS } from "../constants";

// Database type for coming soon products
export interface ComingSoonProduct {
  id: string;
  name_nl: string;
  name_en: string;
  name_pl: string;
  description_nl: string | null;
  description_en: string | null;
  description_pl: string | null;
  price: number;
  image_url: string | null;
  category: string;
  available_from: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend type for coming soon products
export interface ComingSoonItem {
  id: string;
  name: { nl: string; en: string; pl: string };
  description: { nl: string; en: string; pl: string };
  price: number;
  image: string;
  category: string;
  availableFrom: string;
  isActive: boolean;
}

// Convert DB to frontend type
const mapDBToComingSoon = (db: ComingSoonProduct): ComingSoonItem => ({
  id: db.id,
  name: { nl: db.name_nl, en: db.name_en, pl: db.name_pl },
  description: {
    nl: db.description_nl || "",
    en: db.description_en || "",
    pl: db.description_pl || "",
  },
  price: Number(db.price),
  image: db.image_url || "",
  category: db.category,
  availableFrom: db.available_from,
  isActive: db.is_active,
});

// Fetch all coming soon products (active and not yet available)
export const fetchComingSoonProducts = async (): Promise<ComingSoonItem[]> => {
  // Check if Supabase is reachable first
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    // Return local fallback coming soon products (filtered to future dates)
    const today = new Date().toISOString().split("T")[0];
    return LOCAL_COMING_SOON_PRODUCTS.filter(
      (p) => p.isActive && p.availableFrom >= today
    );
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("coming_soon_products")
    .select("*")
    .eq("is_active", true)
    .gte("available_from", today)
    .order("available_from", { ascending: true });

  if (error) {
    return [];
  }

  return (data || []).map(mapDBToComingSoon);
};

// Fetch all coming soon products for admin (including inactive)
export const fetchAllComingSoonProducts = async (): Promise<
  ComingSoonItem[]
> => {
  const { data, error } = await supabase
    .from("coming_soon_products")
    .select("*")
    .order("available_from", { ascending: true });

  if (error) {
    console.error("Error fetching all coming soon products:", error);
    return [];
  }

  return (data || []).map(mapDBToComingSoon);
};

// Create new coming soon product
export const createComingSoonProduct = async (
  product: Omit<ComingSoonItem, "id" | "isActive">
): Promise<ComingSoonItem | null> => {
  const { data, error } = await supabase
    .from("coming_soon_products")
    .insert([
      {
        name_nl: product.name.nl,
        name_en: product.name.en,
        name_pl: product.name.pl,
        description_nl: product.description.nl,
        description_en: product.description.en,
        description_pl: product.description.pl,
        price: product.price,
        image_url: product.image,
        category: product.category,
        available_from: product.availableFrom,
        is_active: true,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating coming soon product:", error);
    return null;
  }

  return mapDBToComingSoon(data);
};

// Update coming soon product
export const updateComingSoonProduct = async (
  id: string,
  product: Partial<ComingSoonItem>
): Promise<ComingSoonItem | null> => {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (product.name) {
    updateData.name_nl = product.name.nl;
    updateData.name_en = product.name.en;
    updateData.name_pl = product.name.pl;
  }
  if (product.description) {
    updateData.description_nl = product.description.nl;
    updateData.description_en = product.description.en;
    updateData.description_pl = product.description.pl;
  }
  if (product.price !== undefined) updateData.price = product.price;
  if (product.image !== undefined) updateData.image_url = product.image;
  if (product.category !== undefined) updateData.category = product.category;
  if (product.availableFrom !== undefined)
    updateData.available_from = product.availableFrom;
  if (product.isActive !== undefined) updateData.is_active = product.isActive;

  const { data, error } = await supabase
    .from("coming_soon_products")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating coming soon product:", error);
    return null;
  }

  return mapDBToComingSoon(data);
};

// Delete coming soon product
export const deleteComingSoonProduct = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from("coming_soon_products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting coming soon product:", error);
    return false;
  }

  return true;
};

// Migrate expired coming soon products to regular products
export const migrateExpiredProducts = async (): Promise<number> => {
  // Check if Supabase is reachable first
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    return 0;
  }

  const today = new Date().toISOString().split("T")[0];

  // Get products that are past their available_from date
  const { data: expiredProducts, error: fetchError } = await supabase
    .from("coming_soon_products")
    .select("*")
    .eq("is_active", true)
    .lt("available_from", today);

  if (fetchError || !expiredProducts || expiredProducts.length === 0) {
    return 0;
  }

  let migratedCount = 0;

  for (const product of expiredProducts) {
    // Insert into products table
    const { error: insertError } = await supabase.from("products").insert([
      {
        name_nl: product.name_nl,
        name_en: product.name_en,
        name_pl: product.name_pl,
        description_nl: product.description_nl,
        description_en: product.description_en,
        description_pl: product.description_pl,
        price: product.price,
        image_url: product.image_url,
        images: product.image_url ? [product.image_url] : [],
        category: product.category,
      },
    ]);

    if (!insertError) {
      // Mark as inactive in coming_soon_products (or delete)
      await supabase
        .from("coming_soon_products")
        .update({ is_active: false })
        .eq("id", product.id);

      migratedCount++;
    }
  }

  return migratedCount;
};

// Get count of products ready to migrate
export const getReadyToMigrateCount = async (): Promise<number> => {
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("coming_soon_products")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .lt("available_from", today);

  if (error) {
    console.error("Error getting ready to migrate count:", error);
    return 0;
  }

  return count || 0;
};
