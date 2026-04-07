const { PrismaClient, Role, ServiceType, ProfileMode } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { buildDemoOrderPayloads } = require("../scripts/filter-demo-orders-data.cjs");

const prisma = new PrismaClient();

function isLocalDatabaseUrl(value = "") {
  return (
    value.startsWith("file:") ||
    value.startsWith("prisma+postgres://localhost") ||
    value.includes("://localhost") ||
    value.includes("://127.0.0.1")
  );
}

function assertSafeSeedEnvironment() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED === "true") {
    return;
  }

  if (process.env.NODE_ENV === "test") {
    return;
  }

  const databaseUrls = [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].filter(Boolean);
  if (databaseUrls.length > 0 && databaseUrls.every((url) => isLocalDatabaseUrl(url))) {
    return;
  }

  throw new Error(
    "Refusing to run destructive seed outside local/test. Set ALLOW_DESTRUCTIVE_SEED=true to override deliberately.",
  );
}

async function main() {
  assertSafeSeedEnvironment();

  await prisma.review.deleteMany();
  await prisma.message.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.image.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const landlordPassword = await bcrypt.hash("Utleier123!", 10);
  const workerPassword = await bcrypt.hash("Tjeneste123!", 10);
  const dualPassword = await bcrypt.hash("Begge123!", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Admin Leder",
      email: "admin@airhost.no",
      phone: "+4790000001",
      password: adminPassword,
      role: Role.ADMIN,
      canLandlord: true,
      canService: true,
      activeMode: ProfileMode.UTLEIER,
    },
  });

  const landlord = await prisma.user.create({
    data: {
      name: "Nora Utleier",
      email: "utleier@airhost.no",
      phone: "+4790000002",
      password: landlordPassword,
      role: Role.UTLEIER,
      canLandlord: true,
      canService: false,
      activeMode: ProfileMode.UTLEIER,
    },
  });

  const worker = await prisma.user.create({
    data: {
      name: "Ali Tjeneste",
      email: "tjeneste@airhost.no",
      phone: "+4790000003",
      password: workerPassword,
      role: Role.TJENESTE,
      canLandlord: false,
      canService: true,
      activeMode: ProfileMode.TJENESTE,
    },
  });

  const dual = await prisma.user.create({
    data: {
      name: "Sara Begge",
      email: "begge@airhost.no",
      phone: "+4790000004",
      password: dualPassword,
      role: Role.UTLEIER,
      canLandlord: true,
      canService: true,
      activeMode: ProfileMode.UTLEIER,
    },
  });

  await prisma.serviceOrder.create({
    data: {
      type: ServiceType.CLEANING,
      address: "Karl Johans gate 12, Oslo",
      date: new Date(Date.now() + 86400000),
      note: "Bytt sengetoy og sjekk badet",
      details: "Bytt sengetoy, vask badet og kontroller at leiligheten er klar til ny innsjekk.",
      guestCount: 2,
      landlordId: landlord.id,
      assignedToId: worker.id,
    },
  });

  const demoOrders = buildDemoOrderPayloads();
  for (const order of demoOrders) {
    await prisma.serviceOrder.create({
      data: {
        type: order.type,
        address: order.address,
        date: new Date(order.date),
        note: order.note,
        details: order.details ?? null,
        guestCount: order.guestCount ?? null,
        landlordId: landlord.id,
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: landlord.id,
      message: "Velkommen! Din forste bestilling er opprettet.",
    },
  });

  console.log("Seed complete", { admin: admin.email, landlord: landlord.email, worker: worker.email, dual: dual.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
