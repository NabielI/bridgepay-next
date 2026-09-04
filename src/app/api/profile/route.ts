import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { activityLogData } from "@/lib/activity-log";
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

  const actorId = session.user.id;
  const actorRole = session.user.role;

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
  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: actorId },
      data: {
        ...profile,
        skills:
          actorRole === "freelancer" ? splitSkills(skills) : undefined,
        rate: actorRole === "freelancer" ? rate ?? null : undefined,
        company: actorRole === "client" ? company ?? null : undefined,
        budget: actorRole === "client" ? budget ?? null : undefined,
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

    await tx.activityLog.create({
      data: activityLogData({
        actorId,
        actorRole,
        action: "profile.updated",
        entityType: "user",
        entityId: updatedUser.id,
        metadata: {
          role: updatedUser.role,
          hasPhone: Boolean(updatedUser.phone),
          skillsCount: updatedUser.skills.length,
        },
      }),
    });

    return updatedUser;
  });

  return NextResponse.json({ user });
}
