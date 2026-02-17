import { prisma } from "@/lib/prisma"
import { moduleRegistry } from "@/core/module-registry"

export class UserModule {
  async create(email: string, name?: string) {
    return prisma.user.create({
      data: {
        email,
        name,
      },
    })
  }

  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    })
  }
}

const userModule = new UserModule()

moduleRegistry.register("user.create", (email: string, name?: string) =>
  userModule.create(email, name)
)

moduleRegistry.register("user.findAll", () =>
  userModule.findAll()
)
