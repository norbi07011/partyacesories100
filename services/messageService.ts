import { supabase } from "./supabaseClient";

const isSupabaseReady = (): boolean => !!supabase;

// Message inquiry type
export interface MessageInquiry {
  id: string;
  customerName: string;
  customerEmail: string;
  productId: string | null;
  productName: string | null;
  message: string;
  read: boolean;
  date: string;
}

// Database message type
interface DBMessage {
  id: string;
  customer_name: string;
  customer_email: string;
  product_id: string | null;
  product_name: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Convert DB to frontend type
const mapDBMessageToMessage = (dbMessage: DBMessage): MessageInquiry => ({
  id: dbMessage.id,
  customerName: dbMessage.customer_name,
  customerEmail: dbMessage.customer_email,
  productId: dbMessage.product_id,
  productName: dbMessage.product_name,
  message: dbMessage.message,
  read: dbMessage.is_read,
  date: dbMessage.created_at,
});

// Fetch all messages
export const fetchMessages = async (): Promise<MessageInquiry[]> => {
  if (!isSupabaseReady()) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }

  return (data as DBMessage[]).map(mapDBMessageToMessage);
};

// Fetch unread messages count
export const fetchUnreadMessagesCount = async (): Promise<number> => {
  if (!isSupabaseReady()) return 0;
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  if (error) {
    console.error("Error fetching unread messages count:", error);
    throw error;
  }

  return count || 0;
};

// Create new message
export const createMessage = async (
  customerName: string,
  customerEmail: string,
  message: string,
  productId?: string,
  productName?: string
): Promise<MessageInquiry> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        customer_name: customerName,
        customer_email: customerEmail,
        product_id: productId || null,
        product_name: productName || null,
        message: message,
        is_read: false,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating message:", error);
    throw error;
  }

  return mapDBMessageToMessage(data as DBMessage);
};

// Mark message as read
export const markMessageAsRead = async (id: string): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { error } = await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
};

// Delete message
export const deleteMessage = async (id: string): Promise<void> => {
  if (!isSupabaseReady()) throw new Error("Database not available");
  const { error } = await supabase.from("messages").delete().eq("id", id);

  if (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
};
