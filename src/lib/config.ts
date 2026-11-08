/** Alamat Edge Functions Supabase (bukan rahasia; data hanya keluar dengan token yang valid). */
export const FUNCTIONS_URL = (process.env.NEXT_PUBLIC_FUNCTIONS_URL ?? "https://qanjzavzbisvpmeihqee.supabase.co/functions/v1").replace(/\/$/, "");
