/**
 * Auth demo (sem NextAuth para simplicidade)
 * Em produção, trocar por Supabase Auth — mesma interface.
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "carreto_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "GERENTE" | "ATENDENTE" | "LOJISTA" | "ENTREGADOR";
  phone?: string | null;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, phone: true, status: true },
  });

  if (!user || user.status === "BLOQUEADO") return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
  };
}

export async function login(email: string, password: string): Promise<SessionUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || user.password !== password) return null;
  if (user.status === "BLOQUEADO") return null;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
    path: "/",
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
  };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
