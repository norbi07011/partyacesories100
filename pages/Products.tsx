import React, { useState, useEffect } from "react";
import { Product, Language } from "../types";
import { TRANSLATIONS } from "../constants";
import ProductCard from "../components/ProductCard";
import ProductPreviewModal from "../components/ProductPreviewModal";
import { fetchProducts, fetchCategories } from "../services/productService";

interface ProductsProps {
  lang: Language;
  onAddToCart: (p: Product) => void;
  onInquiry: (p: Product) => void;
}

const Products: React.FC<ProductsProps> = ({
  lang,
  onAddToCart,
  onInquiry,
}) => {
  const [filter, setFilter] = useState("All");
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const t = (key: string) => TRANSLATIONS[key][lang];

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [productsData, categoriesData] = await Promise.all([
          fetchProducts(),
          fetchCategories(),
        ]);
        setProducts(productsData);
        setCategories(["All", ...categoriesData]);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts =
    filter === "All" ? products : products.filter((p) => p.category === filter);

  return (
    <div className="pt-20 md:pt-32 pb-12 md:pb-20 px-4 md:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-16 gap-4 md:gap-8">
        <div>
          <h2 className="text-3xl md:text-6xl font-black font-display tracking-tight mb-3 md:mb-4">
            {t("nav_products")}
          </h2>
          <div className="h-1 w-16 md:w-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 md:px-6 py-2 rounded-full text-[10px] md:text-xs font-bold transition-all uppercase tracking-widest ${
                filter === cat
                  ? "bg-white text-black shadow-lg neon-glow-blue"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10">
        {loading ? (
          <div className="col-span-full flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-20 text-gray-500">
            {lang === "nl" ? "Geen producten gevonden." : lang === "pl" ? "Nie znaleziono produktów." : "No products found."}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              onAddToCart={onAddToCart}
              onInquiry={onInquiry}
              onPreview={setPreviewProduct}
            />
          ))
        )}
      </div>

      <ProductPreviewModal
        product={previewProduct}
        lang={lang}
        onClose={() => setPreviewProduct(null)}
        onAddToCart={onAddToCart}
        onInquiry={onInquiry}
      />
    </div>
  );
};

export default Products;
