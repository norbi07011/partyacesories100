import { supabase } from "./supabaseClient";
import { DayOverride } from "../types";

const isSupabaseReady = (): boolean => !!supabase;

// Database calendar override type
interface DBCalendarOverride {
  id: string;
  override_date: string;
  status: "available" | "partial" | "blocked";
  note: string | null;
  created_at: string;
  updated_at: string;
}

// Convert DB to frontend type
const mapDBOverrideToOverride = (
  dbOverride: DBCalendarOverride
): DayOverride => ({
  date: dbOverride.override_date,
  status: dbOverride.status,
  note: dbOverride.note || undefined,
});

// Fetch all calendar overrides
export const fetchCalendarOverrides = async (): Promise<DayOverride[]> => {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("calendar_overrides")
    .select("*")
    .order("override_date", { ascending: true });

  if (error) {
    console.error("Error fetching calendar overrides:", error);
    throw error;
  }

  return (data as DBCalendarOverride[]).map(mapDBOverrideToOverride);
};

// Upsert calendar override (create or update)
export const upsertCalendarOverride = async (
  date: string,
  status: "available" | "partial" | "blocked",
  note?: string
): Promise<DayOverride> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { data, error } = await supabase
    .from("calendar_overrides")
    .upsert(
      {
        override_date: date,
        status: status,
        note: note || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "override_date",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting calendar override:", error);
    throw error;
  }

  return mapDBOverrideToOverride(data as DBCalendarOverride);
};

// Delete calendar override
export const deleteCalendarOverride = async (date: string): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { error } = await supabase
    .from("calendar_overrides")
    .delete()
    .eq("override_date", date);

  if (error) {
    console.error("Error deleting calendar override:", error);
    throw error;
  }
};

// Get override for specific date
export const getOverrideForDate = async (
  date: string
): Promise<DayOverride | null> => {
  if (!isSupabaseReady()) return null;
  const { data, error } = await supabase
    .from("calendar_overrides")
    .select("*")
    .eq("override_date", date)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - this is fine
      return null;
    }
    console.error("Error getting override for date:", error);
    throw error;
  }

  return mapDBOverrideToOverride(data as DBCalendarOverride);
};
