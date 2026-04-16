"use server";

import { createServerClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

export async function createTrade(formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: tradeNumber, error: rpcError } = await supabase.rpc(
    "get_and_increment_counter"
  );
  if (rpcError) throw new Error(rpcError.message);

  const entryTypeRaw = formData.get("entry_type") as string;
  const entryType = entryTypeRaw ? JSON.parse(entryTypeRaw) : [];

  const { error } = await supabase.from("trades").insert({
    trade_number: tradeNumber,
    date: formData.get("date") as string,
    units: parseInt(formData.get("units") as string),
    direction: formData.get("direction") as string,
    result: formData.get("result") as string,
    pnl: parseFloat(formData.get("pnl") as string),
    entry_type: entryType,
    entry_time: formData.get("entry_time") as string,
    operation_type: formData.get("operation_type") as string,
    comments: (formData.get("comments") as string) || null,
    photo_urls: [],
    user_id: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function updateTrade(tradeId: string, formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const entryTypeRaw = formData.get("entry_type") as string;
  const entryType = entryTypeRaw ? JSON.parse(entryTypeRaw) : [];

  const { error } = await supabase
    .from("trades")
    .update({
      units: parseInt(formData.get("units") as string),
      direction: formData.get("direction") as string,
      result: formData.get("result") as string,
      pnl: parseFloat(formData.get("pnl") as string),
      entry_type: entryType,
      entry_time: formData.get("entry_time") as string,
      operation_type: formData.get("operation_type") as string,
      comments: (formData.get("comments") as string) || null,
    })
    .eq("id", tradeId);

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function deleteTrade(tradeId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error: deleteError } = await supabase
    .from("trades")
    .delete()
    .eq("id", tradeId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: rpcError } = await supabase.rpc("decrement_counter");
  if (rpcError) throw new Error(rpcError.message);

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function uploadTradePhoto(formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("trade-photos")
    .upload(fileName, file);

  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("trade-photos").getPublicUrl(fileName);

  return publicUrl;
}

export async function getTradesForMonth(year: number, month: number) {
  const supabase = await createServerClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .gte("date", startDate)
    .lt("date", endDate)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllTrades() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .order("date", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function getNextTradeNumber() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("global_counter")
    .select("next_number")
    .eq("id", 1)
    .single();

  if (error) throw new Error(error.message);
  return data.next_number;
}

export async function getFundingAccounts() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("funding_accounts")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createFundingAccount(formData: FormData) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("funding_accounts").insert({
    user_id: user.id,
    name: formData.get("name") as string,
    initial_balance: parseFloat(formData.get("initial_balance") as string),
    account_type: formData.get("account_type") as string,
    start_date: formData.get("start_date") as string,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function deleteFundingAccount(accountId: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase
    .from("funding_accounts")
    .delete()
    .eq("id", accountId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function upsertDailyNote(date: string, content: string) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const normalized = content && content.trim().length > 0 ? content : null;

  const { error } = await supabase.from("daily_notes").upsert(
    {
      user_id: user.id,
      date,
      content: normalized,
    },
    { onConflict: "user_id,date" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
