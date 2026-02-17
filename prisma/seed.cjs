const { PrismaClient, Role, ServiceType, ProfileMode } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
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
      landlordId: landlord.id,
      assignedToId: worker.id,
    },
  });

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