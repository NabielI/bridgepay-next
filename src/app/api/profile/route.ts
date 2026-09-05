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
  bio: z.string().max(1200).optional(),
  experiences: z
    .array(
      z.object({
        company: z.string().max(160).trim(),
        position: z.string().max(160).trim(),
        period: z.string().max(120).trim(),
        description: z.string().max(800).trim(),
      }),
    )
    .max(10)
    .optional(),
  portfolioProjects: z
    .array(
      z.object({
        title: z.string().max(180).trim(),
        description: z.string().max(900).trim(),
        link: z.string().max(300).trim().optional(),
        imageUrl: z.string().max(300).trim().optional(),
      }),
    )
    .max(12)
    .optional(),
  languages: z
    .array(
      z.object({
        language: z.string().max(120).trim(),
        level: z.string().max(120).trim(),
      }),
    )
    .max(8)
    .optional(),
  certifications: z
    .array(
      z.object({
        name: z.string().max(180).trim(),
        issuer: z.string().max(180).trim(),
        issueDate: z.string().max(20).trim(),
        credentialUrl: z.string().max(300).trim().optional(),
      }),
    )
    .max(12)
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

function optionalString(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isValidOptionalUrl(value?: string | null) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseIssueDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
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

  const {
    skills,
    rate,
    company,
    budget,
    bio,
    experiences = [],
    portfolioProjects = [],
    languages = [],
    certifications = [],
    ...profile
  } = parsed.data;
  const normalizedExperiences = experiences
    .filter((item) =>
      [item.company, item.position, item.period, item.description].some(Boolean),
    )
    .map((item, sortOrder) => ({ ...item, sortOrder }));
  const normalizedPortfolioProjects = portfolioProjects
    .filter((item) => [item.title, item.description, item.link, item.imageUrl].some(Boolean))
    .map((item, sortOrder) => ({
      title: item.title,
      description: item.description,
      link: optionalString(item.link),
      imageUrl: optionalString(item.imageUrl),
      sortOrder,
    }));
  const normalizedLanguages = languages
    .filter((item) => [item.language, item.level].some(Boolean))
    .map((item, sortOrder) => ({ ...item, sortOrder }));
  const normalizedCertifications = certifications
    .filter((item) =>
      [item.name, item.issuer, item.issueDate, item.credentialUrl].some(Boolean),
    )
    .map((item, sortOrder) => ({
      name: item.name,
      issuer: item.issuer,
      issueDate: parseIssueDate(item.issueDate),
      credentialUrl: optionalString(item.credentialUrl),
      sortOrder,
    }));

  if (
    actorRole === "freelancer" &&
    (normalizedExperiences.some(
      (item) => !item.company || !item.position || !item.period || !item.description,
    ) ||
      normalizedPortfolioProjects.some((item) => !item.title || !item.description) ||
      normalizedLanguages.some((item) => !item.language || !item.level) ||
      normalizedCertifications.some(
        (item) => !item.name || !item.issuer || !item.issueDate,
      ))
  ) {
    return NextResponse.json(
      { message: "Data CV belum lengkap. Lengkapi field pada item yang diisi." },
      { status: 400 },
    );
  }

  if (
    actorRole === "freelancer" &&
    (normalizedPortfolioProjects.some(
      (item) => !isValidOptionalUrl(item.link) || !isValidOptionalUrl(item.imageUrl),
    ) ||
      normalizedCertifications.some(
        (item) => !isValidOptionalUrl(item.credentialUrl),
      ))
  ) {
    return NextResponse.json(
      { message: "Link portfolio, gambar, atau kredensial harus berupa URL http/https." },
      { status: 400 },
    );
  }

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: actorId },
      data: {
        ...profile,
        bio: actorRole === "freelancer" ? optionalString(bio) : undefined,
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
        bio: true,
        kycStatus: true,
      },
    });

    if (actorRole === "freelancer") {
      await Promise.all([
        tx.freelancerExperience.deleteMany({ where: { freelancerId: actorId } }),
        tx.freelancerPortfolioProject.deleteMany({
          where: { freelancerId: actorId },
        }),
        tx.freelancerLanguage.deleteMany({ where: { freelancerId: actorId } }),
        tx.freelancerCertification.deleteMany({
          where: { freelancerId: actorId },
        }),
      ]);

      await Promise.all([
        normalizedExperiences.length
          ? tx.freelancerExperience.createMany({
              data: normalizedExperiences.map((item) => ({
                freelancerId: actorId,
                company: item.company,
                position: item.position,
                period: item.period,
                description: item.description,
                sortOrder: item.sortOrder,
              })),
            })
          : null,
        normalizedPortfolioProjects.length
          ? tx.freelancerPortfolioProject.createMany({
              data: normalizedPortfolioProjects.map((item) => ({
                freelancerId: actorId,
                title: item.title,
                description: item.description,
                link: item.link,
                imageUrl: item.imageUrl,
                sortOrder: item.sortOrder,
              })),
            })
          : null,
        normalizedLanguages.length
          ? tx.freelancerLanguage.createMany({
              data: normalizedLanguages.map((item) => ({
                freelancerId: actorId,
                language: item.language,
                level: item.level,
                sortOrder: item.sortOrder,
              })),
            })
          : null,
        normalizedCertifications.length
          ? tx.freelancerCertification.createMany({
              data: normalizedCertifications.map((item) => ({
                freelancerId: actorId,
                name: item.name,
                issuer: item.issuer,
                issueDate: item.issueDate!,
                credentialUrl: item.credentialUrl,
                sortOrder: item.sortOrder,
              })),
            })
          : null,
      ]);
    }

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
          experiencesCount: normalizedExperiences.length,
          portfolioProjectsCount: normalizedPortfolioProjects.length,
          languagesCount: normalizedLanguages.length,
          certificationsCount: normalizedCertifications.length,
        },
      }),
    });

    return updatedUser;
  });

  return NextResponse.json({ user });
}
