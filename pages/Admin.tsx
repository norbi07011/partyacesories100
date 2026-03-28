import React, { useState, useEffect } from "react";
import { Language, Booking, Invoice, Product, DayOverride } from "../types";
import { TRANSLATIONS } from "../constants";
import CustomCalendar from "../components/CustomCalendar";
import InvoiceSettingsPanel from "../components/InvoiceSettingsPanel";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct as deleteProductService,
} from "../services/productService";
import {
  fetchBookings,
  updateBookingStatus as updateBookingStatusService,
  fetchBookedDates,
} from "../services/bookingService";
import {
  fetchCalendarOverrides,
  upsertCalendarOverride,
} from "../services/calendarService";
import {
  fetchMessages,
  markMessageAsRead,
  MessageInquiry,
} from "../services/messageService";
import {
  fetchInvoices,
  calculateTotalRevenue,
  createInvoiceFromBooking,
  updateInvoiceStatus,
} from "../services/invoiceService";
import {
  fetchAllComingSoonProducts,
  createComingSoonProduct,
  updateComingSoonProduct,
  deleteComingSoonProduct,
  migrateExpiredProducts,
  getReadyToMigrateCount,
  ComingSoonItem,
} from "../services/comingSoonService";
import InvoiceTemplate from "../components/InvoiceTemplate";
import LineChart from "../components/LineChart";
import BarChart from "../components/BarChart";
import DonutChart from "../components/DonutChart";
import {
  getDashboardStats,
  getTopViewedProducts,
  getTopPurchasedProducts,
  getRevenueOverTime,
  getCategoryStats,
  getDetailedProductViews,
  getRecentProductViews,
  getViewsBySession,
  DetailedProductView,
  RecentView,
  SessionView,
} from "../services/analyticsService";

interface AdminProps {
  lang: Language;
}

const Admin: React.FC<AdminProps> = ({ lang }) => {
  const t = (key: string) => TRANSLATIONS[key][lang];
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "bookings"
    | "calendar"
    | "invoices"
    | "inventory"
    | "messages"
    | "coming_soon"
  >("dashboard");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [messages, setMessages] = useState<MessageInquiry[]>([]);
  const [selectedAdminDate, setSelectedAdminDate] = useState("");
  const [calendarOverrides, setCalendarOverrides] = useState<DayOverride[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  // Analytics State
  const [dashboardStats, setDashboardStats] = useState<{
    totalBookings: number;
    totalRevenue: number;
    pendingBookings: number;
    totalProducts: number;
    totalViews: number;
    conversionRate: number;
  } | null>(null);
  const [topViewedProducts, setTopViewedProducts] = useState<
    Array<{ id: string; name: string; views: number }>
  >([]);
  const [topPurchasedProducts, setTopPurchasedProducts] = useState<
    Array<{ id: string; name: string; purchases: number }>
  >([]);
  const [revenueData, setRevenueData] = useState<
    Array<{ date: string; revenue: number }>
  >([]);
  const [categoryStats, setCategoryStats] = useState<
    Array<{ category: string; count: number }>
  >([]);
  const [detailedProductViews, setDetailedProductViews] = useState<
    DetailedProductView[]
  >([]);
  const [recentViews, setRecentViews] = useState<RecentView[]>([]);
  const [sessionViews, setSessionViews] = useState<SessionView[]>([]);
  // Inventory Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Coming Soon State
  const [comingSoonProducts, setComingSoonProducts] = useState<
    ComingSoonItem[]
  >([]);
  const [isComingSoonModalOpen, setIsComingSoonModalOpen] = useState(false);
  const [editingComingSoon, setEditingComingSoon] =
    useState<ComingSoonItem | null>(null);
  const [readyToMigrateCount, setReadyToMigrateCount] = useState(0);
  // Invoice Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isInvoiceSettingsOpen, setIsInvoiceSettingsOpen] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(
    null
  );

  // Load all data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [
          productsData,
          bookingsData,
          bookedDatesData,
          invoicesData,
          messagesData,
          overridesData,
          revenueData,
          statsData,
          topViewedData,
          topPurchasedData,
          revenueTimeData,
          categoryData,
          detailedViewsData,
          recentViewsData,
          sessionViewsData,
          comingSoonData,
          migrateCountData,
        ] = await Promise.all([
          fetchProducts(),
          fetchBookings(),
          fetchBookedDates(),
          fetchInvoices(),
          fetchMessages(),
          fetchCalendarOverrides(),
          calculateTotalRevenue(),
          getDashboardStats(),
          getTopViewedProducts(5),
          getTopPurchasedProducts(5),
          getRevenueOverTime(30),
          getCategoryStats(),
          getDetailedProductViews(),
          getRecentProductViews(100),
          getViewsBySession(),
          fetchAllComingSoonProducts(),
          getReadyToMigrateCount(),
        ]);
        setInventory(productsData);
        setBookings(bookingsData);
        setBookedDates(bookedDatesData);
        setInvoices(invoicesData);
        setMessages(messagesData);
        setCalendarOverrides(overridesData);
        setTotalRevenue(revenueData);
        setDashboardStats(statsData);
        setTopViewedProducts(topViewedData);
        setTopPurchasedProducts(topPurchasedData);
        setRevenueData(revenueTimeData);
        setCategoryStats(categoryData);
        setDetailedProductViews(detailedViewsData);
        setRecentViews(recentViewsData);
        setSessionViews(sessionViewsData);
        setComingSoonProducts(comingSoonData);
        setReadyToMigrateCount(migrateCountData);
      } catch (error) {
        console.error("Error loading admin data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refresh data helper
  const refreshData = async () => {
    try {
      const [
        productsData,
        bookingsData,
        bookedDatesData,
        invoicesData,
        messagesData,
        overridesData,
        revenueData,
        statsData,
        topViewedData,
        topPurchasedData,
        revenueTimeData,
        categoryData,
        detailedViewsData,
        recentViewsData,
        sessionViewsData,
        comingSoonData,
        migrateCountData,
      ] = await Promise.all([
        fetchProducts(),
        fetchBookings(),
        fetchBookedDates(),
        fetchInvoices(),
        fetchMessages(),
        fetchCalendarOverrides(),
        calculateTotalRevenue(),
        getDashboardStats(),
        getTopViewedProducts(5),
        getTopPurchasedProducts(5),
        getRevenueOverTime(30),
        getCategoryStats(),
        getDetailedProductViews(),
        getRecentProductViews(100),
        getViewsBySession(),
        fetchAllComingSoonProducts(),
        getReadyToMigrateCount(),
      ]);
      setInventory(productsData);
      setBookings(bookingsData);
      setBookedDates(bookedDatesData);
      setInvoices(invoicesData);
      setMessages(messagesData);
      setCalendarOverrides(overridesData);
      setTotalRevenue(revenueData);
      setDashboardStats(statsData);
      setTopViewedProducts(topViewedData);
      setTopPurchasedProducts(topPurchasedData);
      setRevenueData(revenueTimeData);
      setCategoryStats(categoryData);
      setDetailedProductViews(detailedViewsData);
      setRecentViews(recentViewsData);
      setSessionViews(sessionViewsData);
      setComingSoonProducts(comingSoonData);
      setReadyToMigrateCount(migrateCountData);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const existingProduct = inventory.find((p) => p.id === editingProduct.id);

      if (existingProduct) {
        await updateProduct(editingProduct.id, editingProduct);
      } else {
        await createProduct(editingProduct);
      }

      // Refresh inventory
      const updatedProducts = await fetchProducts();
      setInventory(updatedProducts);
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Error saving product. Please try again.");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (
      window.confirm(
        lang === "pl"
          ? "Czy na pewno chcesz usunąć ten produkt?"
          : "Are you sure you want to delete this product?"
      )
    ) {
      try {
        await deleteProductService(id);
        const updatedProducts = await fetchProducts();
        setInventory(updatedProducts);
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Error deleting product. Please try again.");
      }
    }
  };

  const handleCalendarStatusChange = async (status: DayOverride["status"]) => {
    if (!selectedAdminDate) return;

    try {
      await upsertCalendarOverride(selectedAdminDate, status);
      const updatedOverrides = await fetchCalendarOverrides();
      setCalendarOverrides(updatedOverrides);
    } catch (error) {
      console.error("Error updating calendar:", error);
      alert("Error updating calendar. Please try again.");
    }
  };

  const handleUpdateBookingStatus = async (
    id: string,
    status: "confirmed" | "cancelled"
  ) => {
    try {
      await updateBookingStatusService(id, status);
      const updatedBookings = await fetchBookings();
      setBookings(updatedBookings);
    } catch (error) {
      console.error("Error updating booking:", error);
      alert("Error updating booking. Please try again.");
    }
  };

  const bookingsOnSelectedDate = bookings.filter(
    (b) => b.date === selectedAdminDate
  );
  const currentOverride = calendarOverrides.find(
    (o) => o.date === selectedAdminDate
  );

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass p-6 rounded-3xl border-pink-500/20 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">
              {t("admin_total_revenue")}
            </p>
            <svg
              className="w-8 h-8 text-pink-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-black font-display text-pink-500">
            €{dashboardStats?.totalRevenue?.toFixed(2) || "0.00"}
          </h3>
          <p className="text-xs text-green-400 font-bold mt-1">
            {invoices.filter((i) => i.status === "paid").length}{" "}
            {t("dash_paid_invoices")}
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border-blue-500/20 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">
              {t("dash_total_bookings")}
            </p>
            <svg
              className="w-8 h-8 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-black font-display text-blue-400">
            {dashboardStats?.totalBookings || 0}
          </h3>
          <p className="text-xs text-blue-300 font-bold mt-1">
            {bookings.filter((b) => b.status === "confirmed").length}{" "}
            {t("dash_confirmed")}
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border-yellow-500/20 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">
              {t("dash_pending")}
            </p>
            <svg
              className="w-8 h-8 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-black font-display text-yellow-400">
            {dashboardStats?.pendingBookings || 0}
          </h3>
          <p className="text-xs text-yellow-300 font-bold mt-1">
            {t("dash_awaiting_confirmation")}
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border-purple-500/20 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">
              {t("dash_products")}
            </p>
            <svg
              className="w-8 h-8 text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-black font-display text-purple-400">
            {dashboardStats?.totalProducts || 0}
          </h3>
          <p className="text-xs text-purple-300 font-bold mt-1">
            {t("dash_active_products")}
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border-green-500/20 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">
              {t("dash_product_views")}
            </p>
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-black font-display text-green-400">
            {dashboardStats?.totalViews || 0}
          </h3>
          <p className="text-xs text-green-300 font-bold mt-1">
            {t("dash_total_views")}
          </p>
        </div>

        <div className="glass p-6 rounded-3xl border-orange-500/20 shadow-xl hover:scale-105 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest">
              {t("dash_conversion")}
            </p>
            <svg
              className="w-8 h-8 text-orange-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <h3 className="text-3xl font-black font-display text-orange-400">
            {dashboardStats?.conversionRate?.toFixed(1) || "0.0"}%
          </h3>
          <p className="text-xs text-orange-300 font-bold mt-1">
            {t("dash_view_to_booking")}
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black font-display text-white">
            {t("dash_revenue_over_time")}
          </h3>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            {t("dash_last_30_days")}
          </span>
        </div>
        {revenueData.length > 0 ? (
          <LineChart data={revenueData} height={250} color="#ec4899" />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-500">
            {t("dash_no_revenue_data")}
          </div>
        )}
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Viewed Products */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
          <h3 className="text-xl font-black font-display text-white mb-6">
            {t("dash_most_viewed")}
          </h3>
          {topViewedProducts.length > 0 ? (
            <BarChart
              data={topViewedProducts.map((p) => ({
                label: p.name,
                value: p.views,
              }))}
              color="#22c55e"
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              {t("dash_no_view_data")}
            </div>
          )}
        </div>

        {/* Top Purchased Products */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
          <h3 className="text-xl font-black font-display text-white mb-6">
            {t("dash_most_purchased")}
          </h3>
          {topPurchasedProducts.length > 0 ? (
            <BarChart
              data={topPurchasedProducts.map((p) => ({
                label: p.name,
                value: p.purchases,
              }))}
              color="#3b82f6"
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              {t("dash_no_purchase_data")}
            </div>
          )}
        </div>
      </div>

      {/* Category Stats & Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Statistics */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
          <h3 className="text-xl font-black font-display text-white mb-6">
            {t("dash_category_performance")}
          </h3>
          {categoryStats.length > 0 ? (
            <DonutChart
              data={categoryStats.map((cat, idx) => ({
                label:
                  cat.category.charAt(0).toUpperCase() + cat.category.slice(1),
                value: cat.count,
                color: ["#ec4899", "#8b5cf6", "#3b82f6", "#22c55e", "#f59e0b"][
                  idx % 5
                ],
              }))}
              size={180}
            />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              {t("dash_no_category_data")}
            </div>
          )}
        </div>

        {/* Recent Bookings Table */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
          <h3 className="text-xl font-black font-display text-white mb-6">
            {t("dash_recent_bookings")}
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {bookings
              .slice(0, 5)
              .sort(
                (a, b) =>
                  new Date(b.createdAt || "").getTime() -
                  new Date(a.createdAt || "").getTime()
              )
              .map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">
                      {booking.customerName}
                    </p>
                    <p className="text-xs text-gray-500">{booking.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-pink-500">
                      €{(booking.totalPrice || 0).toFixed(2)}
                    </p>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                        booking.status === "confirmed"
                          ? "bg-green-500/20 text-green-400"
                          : booking.status === "cancelled"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            {bookings.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {t("dash_no_bookings")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages & Unread Count */}
      <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black font-display text-white">
            {t("dash_recent_messages")}
          </h3>
          {messages.filter((m) => !m.isRead).length > 0 && (
            <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">
              {messages.filter((m) => !m.isRead).length} {t("dash_unread")}
            </span>
          )}
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
          {messages.slice(0, 5).map((message) => (
            <div
              key={message.id}
              className={`p-4 rounded-xl transition-colors ${
                message.isRead
                  ? "bg-white/5"
                  : "bg-blue-500/10 border border-blue-500/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{message.name}</p>
                  <p className="text-xs text-gray-500">{message.email}</p>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                    {message.message}
                  </p>
                </div>
                {!message.isRead && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse ml-4" />
                )}
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              {t("dash_no_messages")}
            </div>
          )}
        </div>
      </div>

      {/* Detailed Product Views Statistics */}
      <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black font-display text-white">
            📊 {t("dash_detailed_stats")}
          </h3>
          <span className="text-xs text-gray-500 font-bold uppercase tracking-widest">
            {detailedProductViews.length} {t("dash_products_count")}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  {t("dash_product")}
                </th>
                <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  {t("dash_category")}
                </th>
                <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  {t("dash_views")}
                </th>
                <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  {t("dash_unique_sessions")}
                </th>
                <th className="text-center py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  {t("dash_avg_per_session")}
                </th>
                <th className="text-left py-3 px-4 text-xs font-black uppercase tracking-widest text-gray-500">
                  {t("dash_last_viewed")}
                </th>
              </tr>
            </thead>
            <tbody>
              {detailedProductViews.map((view, idx) => (
                <tr
                  key={view.product_id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : idx === 1
                            ? "bg-gray-400/20 text-gray-300"
                            : idx === 2
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className="text-sm font-bold text-white">
                        {view.product_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-bold">
                      {view.product_category}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-lg font-black text-pink-500">
                      {view.total_views}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-sm font-bold text-green-400">
                      {view.unique_sessions}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="text-sm font-bold text-blue-400">
                      {view.avg_views_per_session}x
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs text-gray-400">
                    {new Date(view.last_viewed_at).toLocaleString("pl-PL")}
                  </td>
                </tr>
              ))}
              {detailedProductViews.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    {t("dash_no_view_stats")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Views & Session Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Product Views */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
          <h3 className="text-xl font-black font-display text-white mb-6">
            🕒 {t("dash_recent_views")}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {recentViews.slice(0, 20).map((view) => (
              <div
                key={view.id}
                className="flex items-start justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">
                    {view.product_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {view.event_type === "product_view"
                      ? t("dash_view")
                      : t("dash_click")}
                  </p>
                  {view.city && view.country && (
                    <p className="text-xs text-blue-400 mt-1">
                      📍 {view.city}, {view.country}
                    </p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <p className="text-xs text-gray-400">
                    {new Date(view.created_at).toLocaleTimeString("pl-PL")}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {view.session_id.substring(0, 12)}...
                  </p>
                </div>
              </div>
            ))}
            {recentViews.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {t("dash_no_recent_views")}
              </div>
            )}
          </div>
        </div>

        {/* Session Statistics */}
        <div className="glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl">
          <h3 className="text-xl font-black font-display text-white mb-6">
            👥 {t("dash_session_stats")}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {sessionViews.slice(0, 15).map((session) => (
              <div
                key={session.session_id}
                className="p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-gray-400">
                    {session.session_id.substring(0, 20)}...
                  </span>
                  {session.city && session.country && (
                    <span className="text-xs text-blue-400">
                      📍 {session.city}, {session.country}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {t("dash_views")}
                    </p>
                    <p className="text-lg font-black text-pink-500">
                      {session.total_views}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {t("dash_products")}
                    </p>
                    <p className="text-lg font-black text-green-400">
                      {session.unique_products}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                      {t("dash_duration")}
                    </p>
                    <p className="text-xs font-bold text-blue-400">
                      {Math.round(
                        (new Date(session.last_view).getTime() -
                          new Date(session.first_view).getTime()) /
                          60000
                      )}
                      {t("dash_minutes")}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">
                  {new Date(session.last_view).toLocaleString("pl-PL")}
                </p>
              </div>
            ))}
            {sessionViews.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                {t("dash_no_session_data")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-10">
      {/* Sidebar */}
      <aside className="w-full md:w-64 space-y-4">
        <div className="glass p-6 rounded-[2.5rem] border-white/5 space-y-2 sticky top-32">
          {[
            {
              id: "dashboard",
              label: t("admin_dashboard"),
              icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
            },
            {
              id: "inventory",
              label: t("admin_inventory"),
              icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
            },
            {
              id: "calendar",
              label: t("admin_calendar"),
              icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
            },
            {
              id: "bookings",
              label: t("admin_bookings"),
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
            },
            {
              id: "invoices",
              label:
                lang === "pl"
                  ? "Faktury"
                  : lang === "nl"
                  ? "Facturen"
                  : "Invoices",
              icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            },
            {
              id: "messages",
              label:
                lang === "pl"
                  ? "Wiadomości"
                  : lang === "nl"
                  ? "Berichten"
                  : "Messages",
              icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
            },
            {
              id: "coming_soon",
              label:
                lang === "pl"
                  ? "Wkrótce"
                  : lang === "nl"
                  ? "Binnenkort"
                  : "Coming Soon",
              icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg neon-glow-pink"
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={tab.icon}
                />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="mb-10">
          <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight uppercase">
            {activeTab}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-pink-500 to-blue-500 rounded-full mt-2"></div>
        </header>

        {activeTab === "dashboard" && renderDashboard()}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="animate-in fade-in duration-500 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h4 className="text-3xl font-black font-display uppercase tracking-tight">
                  Magazyn Produktów
                </h4>
                <p className="text-gray-500 text-sm">
                  Zarządzaj ofertą w 3 językach.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct({
                    id: Math.random().toString(36).substr(2, 9),
                    name: { nl: "", en: "", pl: "" },
                    description: { nl: "", en: "", pl: "" },
                    price: 0,
                    image: "",
                    category: "General",
                  });
                  setIsProductModalOpen(true);
                }}
                className="bg-white text-black px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-pink-500 hover:text-white transition-all neon-glow-pink"
              >
                Dodaj Produkt
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {inventory.map((product) => (
                <div
                  key={product.id}
                  className="glass rounded-[2.5rem] overflow-hidden group border-white/5 hover:border-pink-500/50 transition-all duration-500 flex flex-col"
                >
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={
                        product.image ||
                        "https://via.placeholder.com/400x300?text=No+Image"
                      }
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button
                        onClick={() => {
                          setEditingProduct({ ...product });
                          setIsProductModalOpen(true);
                        }}
                        className="p-3 bg-white text-black rounded-xl hover:scale-110 transition-transform"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-3 bg-red-500 text-white rounded-xl hover:scale-110 transition-transform"
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <h5 className="font-bold text-lg mb-1 truncate">
                      {product.name[lang]}
                    </h5>
                    <span className="text-xl font-black text-pink-500">
                      €{product.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Edit Modal */}
            {isProductModalOpen && editingProduct && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
                <div className="glass w-full max-w-4xl rounded-[3rem] p-10 md:p-12 border-white/10 relative my-10 no-scrollbar">
                  <button
                    onClick={() => setIsProductModalOpen(false)}
                    className="absolute top-8 right-8 p-3 glass rounded-full hover:bg-white/10"
                  >
                    <svg
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <h3 className="text-4xl font-black font-display uppercase tracking-tight mb-8">
                    {editingProduct.id ? "Edytuj Produkt" : "Nowy Produkt"}
                  </h3>

                  <form onSubmit={handleSaveProduct} className="space-y-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div>
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                            Zdjęcia (URLs)
                          </label>
                          <div className="space-y-3">
                            {(
                              editingProduct.images || [editingProduct.image]
                            ).map((img, idx) => (
                              <div key={idx} className="flex gap-2">
                                <input
                                  className="flex-1 glass p-4 rounded-xl outline-none border-white/10 focus:border-pink-500 transition-all text-sm"
                                  value={img}
                                  onChange={(e) => {
                                    const newImages = [
                                      ...(editingProduct.images || [
                                        editingProduct.image,
                                      ]),
                                    ];
                                    newImages[idx] = e.target.value;
                                    setEditingProduct({
                                      ...editingProduct,
                                      image: newImages[0] || "",
                                      images: newImages,
                                    });
                                  }}
                                  placeholder="https://images..."
                                />
                                {(
                                  editingProduct.images || [
                                    editingProduct.image,
                                  ]
                                ).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newImages = (
                                        editingProduct.images || [
                                          editingProduct.image,
                                        ]
                                      ).filter((_, i) => i !== idx);
                                      setEditingProduct({
                                        ...editingProduct,
                                        image: newImages[0] || "",
                                        images: newImages,
                                      });
                                    }}
                                    className="p-4 glass rounded-xl hover:bg-red-500/20 hover:border-red-500 border border-white/10 transition-all"
                                  >
                                    <svg
                                      className="h-5 w-5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const currentImages = editingProduct.images || [
                                  editingProduct.image,
                                ];
                                setEditingProduct({
                                  ...editingProduct,
                                  images: [...currentImages, ""],
                                });
                              }}
                              className="w-full p-3 glass rounded-xl border-2 border-dashed border-white/20 hover:border-pink-500 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                              <svg
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              Dodaj kolejne zdjęcie
                            </button>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            {(editingProduct.images || [editingProduct.image])
                              .filter((img) => img)
                              .map((img, idx) => (
                                <div
                                  key={idx}
                                  className="h-32 rounded-xl overflow-hidden border border-white/10 bg-black/20 relative group"
                                >
                                  <img
                                    src={img}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.src =
                                        "https://via.placeholder.com/400x300?text=Error";
                                    }}
                                  />
                                  <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    {idx + 1}
                                  </div>
                                </div>
                              ))}
                            {(
                              editingProduct.images || [editingProduct.image]
                            ).filter((img) => img).length === 0 && (
                              <div className="col-span-2 h-48 rounded-2xl overflow-hidden border border-white/10 bg-black/20 flex items-center justify-center text-gray-600">
                                Podgląd Zdjęć
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                              Cena (€)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full glass p-4 rounded-xl outline-none"
                              value={editingProduct.price}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  price: parseFloat(e.target.value),
                                })
                              }
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">
                              Kategoria
                            </label>
                            <input
                              className="w-full glass p-4 rounded-xl outline-none"
                              value={editingProduct.category}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  category: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        {/* Multilingual Fields */}
                        {["pl", "en", "nl"].map((l) => (
                          <div
                            key={l}
                            className="space-y-3 p-5 glass rounded-2xl border-white/5"
                          >
                            <label className="text-[10px] font-black uppercase text-pink-500 tracking-[0.2em]">
                              {l === "pl"
                                ? "Polski"
                                : l === "en"
                                ? "English"
                                : "Nederlands"}
                            </label>
                            <input
                              required
                              className="w-full bg-black/40 p-3 rounded-lg outline-none text-sm font-bold border border-white/5 focus:border-pink-500"
                              placeholder="Nazwa / Name"
                              value={(editingProduct.name as any)[l]}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  name: {
                                    ...editingProduct.name,
                                    [l]: e.target.value,
                                  },
                                })
                              }
                            />
                            <textarea
                              required
                              className="w-full bg-black/40 p-3 rounded-lg outline-none text-xs min-h-[80px] border border-white/5 focus:border-pink-500"
                              placeholder="Opis / Description"
                              value={(editingProduct.description as any)[l]}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  description: {
                                    ...editingProduct.description,
                                    [l]: e.target.value,
                                  },
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-6 pt-10 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setIsProductModalOpen(false)}
                        className="px-10 py-4 glass rounded-xl text-xs font-black uppercase"
                      >
                        Anuluj
                      </button>
                      <button
                        type="submit"
                        className="px-12 py-4 bg-white text-black rounded-xl text-xs font-black uppercase hover:bg-pink-500 hover:text-white transition-all shadow-2xl neon-glow-pink"
                      >
                        Zapisz Produkt
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
            <div className="lg:col-span-2">
              <CustomCalendar
                bookedDates={bookedDates}
                selectedDate={selectedAdminDate}
                onSelect={setSelectedAdminDate}
                overrides={calendarOverrides}
              />
            </div>
            <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-8 flex flex-col h-fit sticky top-32 shadow-2xl">
              <div>
                <h4 className="text-xl font-black font-display uppercase tracking-tight mb-2">
                  Zarządzaj Dniem
                </h4>
                <p className="text-pink-500 font-mono text-sm">
                  {selectedAdminDate || "Wybierz datę"}
                </p>
              </div>

              {selectedAdminDate ? (
                <>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                      Zmień Status Dnia:
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        onClick={() => handleCalendarStatusChange("available")}
                        className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          currentOverride?.status === "available"
                            ? "bg-green-500 text-white"
                            : "glass border-green-500/30 text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        WOLNE (Zielony)
                      </button>
                      <button
                        onClick={() => handleCalendarStatusChange("partial")}
                        className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          currentOverride?.status === "partial"
                            ? "bg-orange-500 text-white"
                            : "glass border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                        }`}
                      >
                        CZĘŚCIOWO ZAJĘTE (Pomarańczowy)
                      </button>
                      <button
                        onClick={() => handleCalendarStatusChange("blocked")}
                        className={`p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          currentOverride?.status === "blocked"
                            ? "bg-red-500 text-white"
                            : "glass border-red-500/30 text-red-400 hover:bg-red-500/10"
                        }`}
                      >
                        ZABLOKOWANE (Czerwony)
                      </button>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <h5 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
                      Rezerwacje w tym dniu:
                    </h5>
                    {bookingsOnSelectedDate.length > 0 ? (
                      bookingsOnSelectedDate.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 glass rounded-xl text-xs"
                        >
                          <p className="font-bold">{b.customerName}</p>
                          <p className="text-gray-500">{b.customerEmail}</p>
                          <p className="mt-2 text-pink-500 font-black">
                            {b.status.toUpperCase()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs italic text-gray-600">
                        Brak automatycznych rezerwacji.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-20 opacity-40">
                  <p className="text-sm">
                    Kliknij datę w kalendarzu, aby zarządzać jej statusem.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === "bookings" && (
          <div className="glass p-10 rounded-[3rem] border-white/5 animate-in fade-in duration-500 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-2xl font-black font-display uppercase">
                {lang === "pl"
                  ? "Zamówienia ze strony"
                  : lang === "nl"
                  ? "Bestellingen"
                  : "Orders"}
              </h4>
              <button
                onClick={refreshData}
                className="glass px-6 py-3 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-white/10 transition-all"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {lang === "pl" ? "Odśwież" : "Refresh"}
              </button>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-white/10 text-[10px] font-black uppercase text-gray-500">
                <tr>
                  <th className="pb-4">Klient</th>
                  <th className="pb-4">Data</th>
                  <th className="pb-4">Kwota</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4">Faktura</th>
                  <th className="pb-4 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500">
                      {lang === "pl" ? "Brak zamówień" : "No orders yet"}
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    const hasInvoice = invoices.some(
                      (inv) => inv.bookingId === b.id
                    );
                    return (
                      <tr
                        key={b.id}
                        className="group hover:bg-white/5 transition-colors"
                      >
                        <td className="py-6 text-sm font-bold">
                          {b.customerName}
                          <p className="text-[10px] text-gray-500 font-normal">
                            {b.customerEmail}
                          </p>
                          {b.customerPhone && (
                            <p className="text-[10px] text-gray-600 font-normal">
                              {b.customerPhone}
                            </p>
                          )}
                        </td>
                        <td className="py-6 font-mono text-xs text-blue-400">
                          {b.date}
                        </td>
                        <td className="py-6 font-mono text-sm text-pink-500 font-bold">
                          €{(b.total || 0).toFixed(2)}
                        </td>
                        <td className="py-6">
                          <span
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              b.status === "confirmed"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : b.status === "cancelled"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            }`}
                          >
                            {t(`status_${b.status}`)}
                          </span>
                        </td>
                        <td className="py-6">
                          {hasInvoice ? (
                            <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-[10px] font-black uppercase">
                              ✓ {lang === "pl" ? "Wystawiona" : "Generated"}
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                setGeneratingInvoice(b.id);
                                try {
                                  const invoice =
                                    await createInvoiceFromBooking(b, lang);
                                  const updatedInvoices = await fetchInvoices();
                                  setInvoices(updatedInvoices);
                                  setSelectedInvoice(invoice);
                                  setIsInvoiceModalOpen(true);
                                } catch (error) {
                                  console.error(
                                    "Error generating invoice:",
                                    error
                                  );
                                  alert("Error generating invoice");
                                } finally {
                                  setGeneratingInvoice(null);
                                }
                              }}
                              disabled={generatingInvoice === b.id}
                              className="px-4 py-1.5 bg-pink-500 text-white rounded-lg text-[10px] font-black uppercase hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                              {generatingInvoice === b.id ? (
                                <>
                                  <svg
                                    className="animate-spin h-3 w-3"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  ...
                                </>
                              ) : (
                                <>
                                  {lang === "pl"
                                    ? "Generuj Fakturę"
                                    : "Generate Invoice"}
                                </>
                              )}
                            </button>
                          )}
                        </td>
                        <td className="py-6 text-right space-x-2">
                          {b.status === "pending" && (
                            <button
                              onClick={() =>
                                handleUpdateBookingStatus(b.id, "confirmed")
                              }
                              className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:scale-105 transition-all"
                            >
                              {lang === "pl" ? "Potwierdź" : "Confirm"}
                            </button>
                          )}
                          {b.status !== "cancelled" && (
                            <button
                              onClick={() =>
                                handleUpdateBookingStatus(b.id, "cancelled")
                              }
                              className="bg-red-500/20 text-red-400 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                            >
                              {lang === "pl" ? "Anuluj" : "Cancel"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === "invoices" && (
          <div className="glass p-10 rounded-[3rem] border-white/5 animate-in fade-in duration-500 overflow-x-auto">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-2xl font-black font-display uppercase">
                {lang === "pl"
                  ? "Wystawione Faktury"
                  : lang === "nl"
                  ? "Facturen"
                  : "Invoices"}
              </h4>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsInvoiceSettingsOpen(true)}
                  className="glass px-4 py-3 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <svg
                    className="w-5 h-5 text-pink-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {lang === "pl"
                    ? "Ustawienia Faktury"
                    : lang === "nl"
                    ? "Factuur Instellingen"
                    : "Invoice Settings"}
                </button>
                <div className="glass px-6 py-3 rounded-xl">
                  <span className="text-xs text-gray-500">
                    {lang === "pl" ? "Suma przychodów:" : "Total Revenue:"}
                  </span>
                  <span className="ml-2 text-lg font-black text-pink-500">
                    €{totalRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="border-b border-white/10 text-[10px] font-black uppercase text-gray-500">
                <tr>
                  <th className="pb-4">Nr Faktury</th>
                  <th className="pb-4">Klient</th>
                  <th className="pb-4">Data</th>
                  <th className="pb-4">Kwota</th>
                  <th className="pb-4">BTW</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Akcje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center text-gray-500">
                      {lang === "pl"
                        ? "Brak faktur. Wygeneruj fakturę z zakładki Zamówienia."
                        : "No invoices yet. Generate from Orders tab."}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="group hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedInvoice(inv);
                        setIsInvoiceModalOpen(true);
                      }}
                    >
                      <td className="py-6 font-mono text-sm text-blue-400 font-bold">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-6 text-sm font-bold">
                        {inv.customerName}
                        <p className="text-[10px] text-gray-500 font-normal">
                          {inv.customerEmail}
                        </p>
                      </td>
                      <td className="py-6 font-mono text-xs text-gray-400">
                        {inv.date}
                      </td>
                      <td className="py-6 font-mono text-sm text-pink-500 font-bold">
                        €{inv.amount.toFixed(2)}
                      </td>
                      <td className="py-6 font-mono text-xs text-gray-500">
                        €{(inv.btwAmount || 0).toFixed(2)} (
                        {inv.btwPercentage || 21}%)
                      </td>
                      <td className="py-6">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            inv.status === "paid"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}
                        >
                          {inv.status === "paid"
                            ? lang === "pl"
                              ? "Opłacona"
                              : "Paid"
                            : lang === "pl"
                            ? "Nieopłacona"
                            : "Unpaid"}
                        </span>
                      </td>
                      <td
                        className="py-6 text-right space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsInvoiceModalOpen(true);
                          }}
                          className="glass px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:bg-white/10 transition-all"
                        >
                          {lang === "pl" ? "Podgląd" : "View"}
                        </button>
                        {inv.status === "unpaid" && (
                          <button
                            onClick={async () => {
                              try {
                                await updateInvoiceStatus(inv.id, "paid");
                                const updatedInvoices = await fetchInvoices();
                                setInvoices(updatedInvoices);
                                const revenue = await calculateTotalRevenue();
                                setTotalRevenue(revenue);
                              } catch (error) {
                                console.error("Error updating invoice:", error);
                              }
                            }}
                            className="bg-green-500 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase hover:scale-105 transition-all"
                          >
                            {lang === "pl"
                              ? "Oznacz jako opłaconą"
                              : "Mark Paid"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === "messages" && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <h4 className="text-2xl font-black font-display uppercase">
                {lang === "pl"
                  ? "Wiadomości od klientów"
                  : lang === "nl"
                  ? "Berichten van klanten"
                  : "Customer Messages"}
              </h4>
              <div className="glass px-4 py-2 rounded-xl">
                <span className="text-xs text-gray-500">
                  {lang === "pl" ? "Nieprzeczytane:" : "Unread:"}
                </span>
                <span className="ml-2 text-lg font-black text-pink-500">
                  {messages.filter((m) => !m.read).length}
                </span>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="glass p-20 rounded-[3rem] text-center text-gray-500">
                {lang === "pl" ? "Brak wiadomości" : "No messages yet"}
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`glass p-6 rounded-2xl border transition-all ${
                      msg.read
                        ? "border-white/5 opacity-60"
                        : "border-pink-500/30 shadow-lg shadow-pink-500/10"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h5 className="font-bold text-lg">{msg.name}</h5>
                        <p className="text-sm text-gray-500">{msg.email}</p>
                        {msg.phone && (
                          <p className="text-xs text-gray-600">{msg.phone}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-mono">
                          {new Date(msg.createdAt).toLocaleDateString(
                            lang === "nl"
                              ? "nl-NL"
                              : lang === "pl"
                              ? "pl-PL"
                              : "en-US"
                          )}
                        </p>
                        <p className="text-xs text-gray-600 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString(
                            lang === "nl"
                              ? "nl-NL"
                              : lang === "pl"
                              ? "pl-PL"
                              : "en-US",
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </p>
                        {!msg.read && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-pink-500 text-white text-[8px] font-black uppercase rounded">
                            {lang === "pl" ? "Nowa" : "New"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-xl mb-4">
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                    <div className="flex justify-between items-center">
                      <a
                        href={`mailto:${msg.email}?subject=Re: ${
                          lang === "pl" ? "Zapytanie" : "Inquiry"
                        } - Party Accessoires Verhuur`}
                        className="glass px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-pink-500 hover:text-white transition-all flex items-center gap-2"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {lang === "pl" ? "Odpowiedz" : "Reply"}
                      </a>
                      {!msg.read && (
                        <button
                          onClick={async () => {
                            try {
                              await markMessageAsRead(msg.id);
                              const updatedMessages = await fetchMessages();
                              setMessages(updatedMessages);
                            } catch (error) {
                              console.error(
                                "Error marking message as read:",
                                error
                              );
                            }
                          }}
                          className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          {lang === "pl"
                            ? "Oznacz jako przeczytane"
                            : "Mark as read"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Coming Soon Tab */}
        {activeTab === "coming_soon" && (
          <div className="animate-in fade-in duration-500 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h4 className="text-3xl font-black font-display uppercase tracking-tight">
                  {lang === "pl"
                    ? "Wkrótce w ofercie"
                    : lang === "nl"
                    ? "Binnenkort beschikbaar"
                    : "Coming Soon"}
                </h4>
                <p className="text-gray-500 text-sm">
                  {lang === "pl"
                    ? "Produkty które pojawią się w ofercie w przyszłości."
                    : lang === "nl"
                    ? "Producten die binnenkort beschikbaar zijn."
                    : "Products that will be available soon."}
                </p>
              </div>
              <div className="flex gap-4">
                {readyToMigrateCount > 0 && (
                  <button
                    onClick={async () => {
                      const migrated = await migrateExpiredProducts();
                      if (migrated > 0) {
                        alert(
                          lang === "pl"
                            ? `Przeniesiono ${migrated} produkt(ów) do oferty!`
                            : `Migrated ${migrated} product(s) to inventory!`
                        );
                        refreshData();
                      }
                    }}
                    className="bg-green-500 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {lang === "pl"
                      ? `Przenieś (${readyToMigrateCount})`
                      : `Migrate (${readyToMigrateCount})`}
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingComingSoon({
                      id: "",
                      name: { nl: "", en: "", pl: "" },
                      description: { nl: "", en: "", pl: "" },
                      price: 0,
                      image: "",
                      category: "Entertainment",
                      availableFrom: new Date(
                        Date.now() + 7 * 24 * 60 * 60 * 1000
                      )
                        .toISOString()
                        .split("T")[0],
                      isActive: true,
                    });
                    setIsComingSoonModalOpen(true);
                  }}
                  className="bg-yellow-500 text-black px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-yellow-400 transition-all"
                >
                  {lang === "pl"
                    ? "Dodaj produkt"
                    : lang === "nl"
                    ? "Product toevoegen"
                    : "Add Product"}
                </button>
              </div>
            </div>

            {/* Coming Soon Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonProducts.map((product) => {
                const daysUntil = Math.ceil(
                  (new Date(product.availableFrom).getTime() -
                    new Date().getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                const isPast = daysUntil < 0;

                return (
                  <div
                    key={product.id}
                    className={`glass rounded-2xl overflow-hidden border ${
                      isPast ? "border-green-500/30" : "border-yellow-500/20"
                    }`}
                  >
                    <div className="relative h-40">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name[lang]}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-yellow-500/50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      <div
                        className={`absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-bold ${
                          isPast
                            ? "bg-green-500 text-black"
                            : "bg-yellow-500 text-black"
                        }`}
                      >
                        {isPast
                          ? lang === "pl"
                            ? "Gotowe!"
                            : "Ready!"
                          : `${daysUntil} ${lang === "pl" ? "dni" : "days"}`}
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-1 glass rounded-full text-[10px] font-bold">
                        {product.category}
                      </div>
                    </div>
                    <div className="p-4">
                      <h5 className="font-bold text-lg mb-1">
                        {product.name[lang]}
                      </h5>
                      <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                        {product.description[lang]}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-yellow-400">
                          €{product.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(product.availableFrom).toLocaleDateString(
                            lang === "pl" ? "pl-PL" : "nl-NL"
                          )}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {
                            setEditingComingSoon(product);
                            setIsComingSoonModalOpen(true);
                          }}
                          className="flex-1 px-3 py-2 glass rounded-xl text-xs font-bold hover:bg-white/10"
                        >
                          {lang === "pl" ? "Edytuj" : "Edit"}
                        </button>
                        <button
                          onClick={async () => {
                            if (
                              confirm(
                                lang === "pl"
                                  ? "Usunąć ten produkt?"
                                  : "Delete this product?"
                              )
                            ) {
                              await deleteComingSoonProduct(product.id);
                              refreshData();
                            }
                          }}
                          className="px-3 py-2 glass rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/20"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {comingSoonProducts.length === 0 && (
              <div className="text-center py-20 glass rounded-3xl">
                <svg
                  className="w-16 h-16 mx-auto text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-gray-500">
                  {lang === "pl"
                    ? "Brak produktów w kategorii 'Wkrótce'"
                    : "No coming soon products"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Coming Soon Modal */}
        {isComingSoonModalOpen && editingComingSoon && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
            <div className="glass w-full max-w-2xl rounded-3xl p-8 my-10">
              <h3 className="text-2xl font-black mb-6">
                {editingComingSoon.id
                  ? lang === "pl"
                    ? "Edytuj produkt"
                    : "Edit Product"
                  : lang === "pl"
                  ? "Nowy produkt 'Wkrótce'"
                  : "New Coming Soon Product"}
              </h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (editingComingSoon.id) {
                    await updateComingSoonProduct(
                      editingComingSoon.id,
                      editingComingSoon
                    );
                  } else {
                    await createComingSoonProduct(editingComingSoon);
                  }
                  setIsComingSoonModalOpen(false);
                  setEditingComingSoon(null);
                  refreshData();
                }}
                className="space-y-6"
              >
                {/* Names in 3 languages */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Nazwa (NL)
                    </label>
                    <input
                      type="text"
                      value={editingComingSoon.name.nl}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          name: {
                            ...editingComingSoon.name,
                            nl: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Name (EN)
                    </label>
                    <input
                      type="text"
                      value={editingComingSoon.name.en}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          name: {
                            ...editingComingSoon.name,
                            en: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Nazwa (PL)
                    </label>
                    <input
                      type="text"
                      value={editingComingSoon.name.pl}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          name: {
                            ...editingComingSoon.name,
                            pl: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Descriptions in 3 languages */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Beschrijving (NL)
                    </label>
                    <textarea
                      value={editingComingSoon.description.nl}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          description: {
                            ...editingComingSoon.description,
                            nl: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none h-20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Description (EN)
                    </label>
                    <textarea
                      value={editingComingSoon.description.en}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          description: {
                            ...editingComingSoon.description,
                            en: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none h-20 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Opis (PL)
                    </label>
                    <textarea
                      value={editingComingSoon.description.pl}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          description: {
                            ...editingComingSoon.description,
                            pl: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none h-20 resize-none"
                    />
                  </div>
                </div>

                {/* Price, Category, Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      {lang === "pl" ? "Cena (€)" : "Price (€)"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingComingSoon.price}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      {lang === "pl" ? "Kategoria" : "Category"}
                    </label>
                    <select
                      value={editingComingSoon.category}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          category: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none bg-transparent"
                    >
                      <option value="Catering">Catering</option>
                      <option value="Effects">Effects</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Equipment">Equipment</option>
                      <option value="Furniture">Furniture</option>
                      <option value="Packages">Packages</option>
                      <option value="Services">Services</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      {lang === "pl" ? "Dostępne od" : "Available from"}
                    </label>
                    <input
                      type="date"
                      value={editingComingSoon.availableFrom}
                      onChange={(e) =>
                        setEditingComingSoon({
                          ...editingComingSoon,
                          availableFrom: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Image Section */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    {lang === "pl" ? "Zdjęcie produktu" : "Product Image"}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Image Preview */}
                    <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-white/10 flex items-center justify-center">
                      {editingComingSoon.image ? (
                        <img
                          src={editingComingSoon.image}
                          alt="Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="text-center text-gray-500">
                          <svg
                            className="w-12 h-12 mx-auto mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="text-xs">
                            {lang === "pl" ? "Brak zdjęcia" : "No image"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Image Input Options */}
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          {lang === "pl"
                            ? "Ścieżka do pliku (np. /images/nazwa.jpg)"
                            : "File path (e.g. /images/name.jpg)"}
                        </label>
                        <input
                          type="text"
                          value={editingComingSoon.image}
                          onChange={(e) =>
                            setEditingComingSoon({
                              ...editingComingSoon,
                              image: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none text-sm"
                          placeholder="/images/nazwa-zdjecia.jpg"
                        />
                      </div>

                      <div className="text-[10px] text-gray-500 p-3 glass rounded-lg">
                        <p className="font-bold mb-1">
                          💡{" "}
                          {lang === "pl"
                            ? "Jak dodać zdjęcie:"
                            : "How to add image:"}
                        </p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>
                            {lang === "pl"
                              ? "Skopiuj zdjęcie do folderu: public/images/"
                              : "Copy image to folder: public/images/"}
                          </li>
                          <li>
                            {lang === "pl"
                              ? "Wpisz ścieżkę: /images/twoje-zdjecie.jpg"
                              : "Enter path: /images/your-image.jpg"}
                          </li>
                        </ol>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          {lang === "pl"
                            ? "Lub link zewnętrzny (URL)"
                            : "Or external link (URL)"}
                        </label>
                        <input
                          type="url"
                          value={
                            editingComingSoon.image.startsWith("/")
                              ? ""
                              : editingComingSoon.image
                          }
                          onChange={(e) =>
                            setEditingComingSoon({
                              ...editingComingSoon,
                              image: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 glass rounded-xl border-white/10 focus:border-yellow-500/50 outline-none text-sm"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsComingSoonModalOpen(false);
                      setEditingComingSoon(null);
                    }}
                    className="flex-1 px-6 py-4 glass rounded-xl font-bold hover:bg-white/10"
                  >
                    {lang === "pl" ? "Anuluj" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-yellow-500 text-black rounded-xl font-bold hover:bg-yellow-400"
                  >
                    {lang === "pl" ? "Zapisz" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invoice Preview Modal */}
        {isInvoiceModalOpen && selectedInvoice && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
            <div className="relative w-full max-w-4xl my-10">
              <button
                onClick={() => {
                  setIsInvoiceModalOpen(false);
                  setSelectedInvoice(null);
                }}
                className="absolute -top-4 -right-4 z-10 p-3 glass rounded-full hover:bg-white/10"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              <InvoiceTemplate
                invoice={selectedInvoice}
                lang={lang}
                onPrint={() => window.print()}
              />
            </div>
          </div>
        )}

        {/* Invoice Settings Modal */}
        {isInvoiceSettingsOpen && (
          <InvoiceSettingsPanel
            lang={lang}
            onClose={() => setIsInvoiceSettingsOpen(false)}
          />
        )}
      </main>
    </div>
  );
};

export default Admin;
