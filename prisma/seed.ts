import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.HOST_ADMIN_EMAIL;
  const password = process.env.HOST_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "HOST_ADMIN_EMAIL and HOST_ADMIN_PASSWORD must be set to seed the host user.",
    );
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.hostUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`Seeded host user: ${user.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
