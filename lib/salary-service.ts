import { SupabaseClient } from "@supabase/supabase-js";
import {
  Bonus,
  BonusInput,
  SalaryAllocation,
  SalaryAllocationInput,
  SalaryMonth,
  SalaryMonthInput,
} from "./types";

/**
 * Salary, allocations and bonuses.
 *
 * As everywhere else, every query is scoped by `userId`, and updates and
 * deletes match on `id` AND `user_id` together so another account's row id
 * simply affects nothing.
 */

const num = <T extends { amount: number }>(row: T): T => ({ ...row, amount: Number(row.amount) });

/* ==================================================================
   Monthly salary
   ================================================================== */

export async function getSalaryMonths(
  supabase: SupabaseClient,
  userId: string
): Promise<SalaryMonth[]> {
  const { data, error } = await supabase
    .from("salary_months")
    .select("id, month, amount, notes")
    .eq("user_id", userId)
    .order("month", { ascending: false });

  if (error) throw error;
  return ((data as SalaryMonth[]) ?? []).map(num);
}

/**
 * Sets the salary for one month. An amount of 0 clears it, so "not entered
 * yet" stays distinguishable from "earned nothing" — the first shows a prompt
 * to add one, the second would read as a real zero.
 */
export async function upsertSalaryMonth(
  supabase: SupabaseClient,
  userId: string,
  input: SalaryMonthInput
): Promise<SalaryMonth | null> {
  if (input.amount <= 0) {
    const { error } = await supabase
      .from("salary_months")
      .delete()
      .eq("user_id", userId)
      .eq("month", input.month);
    if (error) throw error;
    return null;
  }

  const { data, error } = await supabase
    .from("salary_months")
    .upsert(
      { user_id: userId, month: input.month, amount: input.amount, notes: input.notes },
      { onConflict: "user_id,month" }
    )
    .select("id, month, amount, notes")
    .single();

  if (error) throw error;
  return num(data as SalaryMonth);
}

/* ==================================================================
   Allocations — what the month's money went to
   ================================================================== */

export async function getSalaryAllocations(
  supabase: SupabaseClient,
  userId: string
): Promise<SalaryAllocation[]> {
  const { data, error } = await supabase
    .from("salary_allocations")
    .select("id, month, label, amount")
    .eq("user_id", userId)
    .order("amount", { ascending: false });

  if (error) throw error;
  return ((data as SalaryAllocation[]) ?? []).map(num);
}

export async function createAllocation(
  supabase: SupabaseClient,
  userId: string,
  input: SalaryAllocationInput
) {
  const { data, error } = await supabase
    .from("salary_allocations")
    .insert({ ...input, user_id: userId })
    .select("id, month, label, amount")
    .single();
  if (error) throw error;
  return num(data as SalaryAllocation);
}

export async function updateAllocation(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: SalaryAllocationInput
) {
  const { data, error } = await supabase
    .from("salary_allocations")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, month, label, amount")
    .maybeSingle();
  if (error) throw error;
  return data ? num(data as SalaryAllocation) : null;
}

export async function deleteAllocation(
  supabase: SupabaseClient,
  userId: string,
  id: string
) {
  const { error, count } = await supabase
    .from("salary_allocations")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ==================================================================
   Bonuses
   ================================================================== */

export async function getBonuses(
  supabase: SupabaseClient,
  userId: string
): Promise<Bonus[]> {
  const { data, error } = await supabase
    .from("bonuses")
    .select("id, received_on, label, amount, notes")
    .eq("user_id", userId)
    .order("received_on", { ascending: false });

  if (error) throw error;
  return ((data as Bonus[]) ?? []).map(num);
}

export async function createBonus(
  supabase: SupabaseClient,
  userId: string,
  input: BonusInput
) {
  const { data, error } = await supabase
    .from("bonuses")
    .insert({ ...input, user_id: userId })
    .select("id, received_on, label, amount, notes")
    .single();
  if (error) throw error;
  return num(data as Bonus);
}

export async function updateBonus(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  input: BonusInput
) {
  const { data, error } = await supabase
    .from("bonuses")
    .update(input)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id, received_on, label, amount, notes")
    .maybeSingle();
  if (error) throw error;
  return data ? num(data as Bonus) : null;
}

export async function deleteBonus(supabase: SupabaseClient, userId: string, id: string) {
  const { error, count } = await supabase
    .from("bonuses")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
