const { PrismaClient } = require("@prisma/client");
const { encryptPassword } = require("../../src/helper/bcrypt");

const prisma = new PrismaClient();

async function userSeed() {
  return await prisma.user.upsert({
    where: { email: "superadmin@mail.com" },
    update: {},
    create: {
      email: "superadmin@mail.com",
      fullname: "Super Duper Admin",
      password: await encryptPassword("123456"),
      roleId: 1,
    },
  });
}

module.exports = userSeed;