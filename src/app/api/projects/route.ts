import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const projectSchema = z.object({
  title: z.string().min(3).max(120).trim(),
  description: z.string().min(10).max(4000).trim(),
  category: z.string().min(2).max(80).trim(),
  budget: z.coerce.number().int().positive().max(1_000_000),
  deadline: z.coerce.date().refine((value) => value > new Date(), {
    message: "Deadline harus tanggal ke depan.",
  }),
});

function projectSelect() {
  return {
    id: true,
    title: true,
    description: true,
    category: true,
    budget: true,
    currency: true,
    deadline: true,
    status: true,
    createdAt: true,
    escrow: {
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        paymentMethod: true,
      },
    },
    client: {
      select: {
        name: true,
        email: true,
        company: true,
      },
    },
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where:
      session.user.role === "client"
        ? { clientId: session.user.id }
        : { status: "open" },
    orderBy: { createdAt: "desc" },
    select: projectSelect(),
  });

  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (session.user.role !== "client") {
    return NextResponse.json(
      { message: "Hanya client yang bisa membuat proyek." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Data proyek tidak valid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      ...parsed.data,
      clientId: session.user.id,
      escrow: {
        create: {
          amount: parsed.data.budget,
          currency: "USD",
          status: "pending",
          paymentMethod: "master_account",
          events: {
            create: {
              actorId: session.user.id,
              actorRole: "client",
              fromStatus: null,
              toStatus: "pending",
              note: "Project dibuat. Escrow menunggu pendanaan client.",
            },
          },
        },
      },
    },
    select: projectSelect(),
  });

  return NextResponse.json({ project }, { status: 201 });
}
