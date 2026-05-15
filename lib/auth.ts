import { cookies } from "next/headers";
import { randomBytes, timingSafeEqual } from "crypto";
import { getServerClient } from "./supabase";

const COOKIE_NAME = "hitster_admin";
const SESSION_TTL_DAYS = 14;

export function verifyAdminPassword(submitted: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createAdminSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  const supabase = getServerClient();
  const { error } = await supabase.from("admin_sessions").insert({
    token,
    expires_at: expiresAt.toISOString(),
  });
  if (error) throw new Error(`Failed to create session: ${error.message}`);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroyAdminSession(): Promise<void> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (token) {
    const supabase = getServerClient();
    await supabase.from("admin_sessions").delete().eq("token", token);
  }
  cookies().delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;

  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("expires_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) return false;
  return new Date(data.expires_at) > new Date();
}
