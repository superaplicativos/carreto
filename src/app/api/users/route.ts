import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/users — gestão de usuários (admin/gerente)
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "ADMIN" && user.role !== "GERENTE") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      lojistaProfile: { include: { shopping: { select: { name: true } } } },
      entregadorProfile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

