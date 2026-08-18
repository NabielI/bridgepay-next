import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  phone: z.string().min(6).max(32).trim(),
  skills: z.string().max(300).optional(),
  rate: z.string().max(120).optional(),
  company: z.string().max(160).optional(),
  budget: z.string().max(120).optional(),
});

function splitSkills(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data profil tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { skills, rate, company, budget, ...profile } = parsed.data;
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...profile,
      skills:
        session.user.role === "freelancer" ? splitSkills(skills) : undefined,
      rate: session.user.role === "freelancer" ? rate ?? null : undefined,
      company: session.user.role === "client" ? company ?? null : undefined,
      budget: session.user.role === "client" ? budget ?? null : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      skills: true,
      rate: true,
      company: true,
      budget: true,
      kycStatus: true,
    },
  });

  return NextResponse.json({ user });
}
