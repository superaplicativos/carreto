import { NextRequest, NextResponse } from "next/server";
import { login, logout, getSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 });
      }
      const user = await login(email, password);
      if (!user) {
        return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
      }
      return NextResponse.json({ user });
    }

    if (action === "logout") {
      await logout();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno", detail: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSession();
  return NextResponse.json({ user });
}
