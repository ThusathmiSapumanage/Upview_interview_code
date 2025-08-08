import { supabase } from "@/lib/supabaseClient";

export async function getBaseCurrency(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "LKR";
  const { data } = await supabase
    .from("profiles")
    .select("base_currency")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.base_currency || "LKR").toUpperCase();
}
