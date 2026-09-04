import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const registerSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(128),
  phone: z.string().min(6).max(32).trim(),
  role: z.enum(["freelancer", "client"]),
  onboarding: z
    .object({
      skills: z.string().optional(),
      rate: z.string().optional(),
      company: z.string().optional(),
      budget: z.string().optional(),
    })
    .optional(),
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

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data register tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { email, password, role, onboarding, ...profile } = parsed.data;

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    return NextResponse.json(
      { message: "Email sudah terdaftar." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        ...profile,
        email,
        passwordHash,
        role,
        kycStatus: "pending",
        skills: role === "freelancer" ? splitSkills(onboarding?.skills) : [],
        rate: role === "freelancer" ? onboarding?.rate : null,
        company: role === "client" ? onboarding?.company : null,
        budget: role === "client" ? onboarding?.budget : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        kycStatus: true,
        createdAt: true,
      },
    });

    await tx.activityLog.create({
      data: activityLogData({
        actorId: createdUser.id,
        actorRole: createdUser.role,
        action: "user.registered",
        entityType: "user",
        entityId: createdUser.id,
        metadata: {
          email: createdUser.email,
          kycStatus: createdUser.kycStatus,
        },
      }),
    });

    return createdUser;
  });

  return NextResponse.json({ user }, { status: 201 });
}
