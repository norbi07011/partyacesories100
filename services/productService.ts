import { supabase, checkSupabaseConnection } from "./supabaseClient";
import { Product } from "../types";
import { PRODUCTS } from "../constants";

// Database product type (from Supabase)
interface DBProduct {
  id: string;
  name_nl: string;
  name_en: string;
  name_pl: string;
  description_nl: string | null;
  description_en: string | null;
  description_pl: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  images: any | null;
  category: string;
  address: string | null;
  contact_link: string | null;
  custom_price_text_nl: string | null;
  custom_price_text_en: string | null;
  custom_price_text_pl: string | null;
  created_at: string;
  updated_at: string;
}

// Convert DB product to frontend Product type
const mapDBProductToProduct = (dbProduct: DBProduct): Product => ({
  id: dbProduct.id,
  name: {
    nl: dbProduct.name_nl,
    en: dbProduct.name_en,
    pl: dbProduct.name_pl,
  },
  description: {
    nl: dbProduct.description_nl || "",
    en: dbProduct.description_en || "",
    pl: dbProduct.description_pl || "",
  },
  price: Number(dbProduct.price),
  originalPrice: dbProduct.original_price
    ? Number(dbProduct.original_price)
    : undefined,
  image: dbProduct.image_url || "",
  images: Array.isArray(dbProduct.images)
    ? dbProduct.images
    : dbProduct.image_url
    ? [dbProduct.image_url]
    : [],
  category: dbProduct.category,
  address: dbProduct.address || undefined,
  contactLink: dbProduct.contact_link || undefined,
  customPriceText: dbProduct.custom_price_text_nl
    ? {
        nl: dbProduct.custom_price_text_nl || "",
        en: dbProduct.custom_price_text_en || "",
        pl: dbProduct.custom_price_text_pl || "",
      }
    : undefined,
});

// Convert frontend Product to DB format
const mapProductToDBProduct = (product: Product): Partial<DBProduct> => ({
  id: product.id,
  name_nl: product.name.nl,
  name_en: product.name.en,
  name_pl: product.name.pl,
  description_nl: product.description.nl,
  description_en: product.description.en,
  description_pl: product.description.pl,
  price: product.price,
  original_price: product.originalPrice || null,
  image_url: product.image,
  images: product.images || [product.image],
  category: product.category,
  address: product.address || null,
});

// Fetch all products
export const fetchProducts = async (): Promise<Product[]> => {
  // Check if Supabase is reachable first
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    return PRODUCTS;
  }

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Using local products (Supabase error)");
      return PRODUCTS;
    }

    // If Supabase is empty or returns no data, use local products
    if (!data || data.length === 0) {
      return PRODUCTS;
    }

    return (data as DBProduct[]).map(mapDBProductToProduct);
  } catch (err) {
    return PRODUCTS;
  }
};

// Fetch single product by ID
export const fetchProductById = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching product:", error);
    return null;
  }

  return mapDBProductToProduct(data as DBProduct);
};

// Create new product
export const createProduct = async (
  product: Omit<Product, "id">
): Promise<Product> => {
  const dbProduct = mapProductToDBProduct({ ...product, id: "" });
  delete dbProduct.id; // Let Supabase generate the ID

  const { data, error } = await supabase
    .from("products")
    .insert([dbProduct])
    .select()
    .single();

  if (error) {
    console.error("Error creating product:", error);
    throw error;
  }

  return mapDBProductToProduct(data as DBProduct);
};

// Update existing product
export const updateProduct = async (
  id: string,
  product: Partial<Product>
): Promise<Product> => {
  const dbProduct = mapProductToDBProduct({ ...product, id } as Product);

  const { data, error } = await supabase
    .from("products")
    .update(dbProduct)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating product:", error);
    throw error;
  }

  return mapDBProductToProduct(data as DBProduct);
};

// Delete product
export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Fetch products by category
export const fetchProductsByCategory = async (
  category: string
): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching products by category:", error);
    throw error;
  }

  return (data as DBProduct[]).map(mapDBProductToProduct);
};

// Fetch unique categories
export const fetchCategories = async (): Promise<string[]> => {
  // Check if Supabase is reachable first
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    return [...new Set(PRODUCTS.map((p) => p.category))];
  }

  try {
    const { data, error } = await supabase.from("products").select("category");

    if (error) {
      return [...new Set(PRODUCTS.map((p) => p.category))];
    }

    if (!data || data.length === 0) {
      return [...new Set(PRODUCTS.map((p) => p.category))];
    }

    const categories = [
      ...new Set((data as { category: string }[]).map((p) => p.category)),
    ];
    return categories;
  } catch (err) {
    return [...new Set(PRODUCTS.map((p) => p.category))];
  }
};
