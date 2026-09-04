import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({ quiet: true });

const prisma = new PrismaClient();

function argValue(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

const email = (argValue("--email") ?? process.env.ADMIN_EMAIL ?? "")
  .trim()
  .toLowerCase();
const password = process.env.ADMIN_INITIAL_PASSWORD;

if (!email || !email.includes("@")) {
  console.error('Admin email wajib diisi. Contoh: npm run admin:create -- --email "admin@example.com"');
  process.exit(1);
}

if (!password || password.length < 12) {
  console.error("ADMIN_INITIAL_PASSWORD wajib diisi di .env dan minimal 12 karakter.");
  process.exit(1);
}

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "admin",
      kycStatus: "verified",
      sessionVersion: { increment: 1 },
    },
    create: {
      name: "BridgePay Admin",
      email,
      passwordHash,
      role: "admin",
      kycStatus: "verified",
      skills: [],
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      role: true,
      kycStatus: true,
    },
  });

  await prisma.activityLog.create({
    data: {
      actorId: admin.id,
      actorRole: "admin",
      action: existingUser ? "admin.promoted" : "admin.created",
      entityType: "user",
      entityId: admin.id,
      metadata: {
        email: admin.email,
        previousRole: existingUser?.role ?? null,
        role: admin.role,
      },
    },
  });

  console.log(
    `${existingUser ? "Updated" : "Created"} admin ${admin.email} (${admin.id}).`,
  );
} finally {
  await prisma.$disconnect();
}
