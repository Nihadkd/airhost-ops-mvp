type ModuleHandler = (...args: any[]) => any

class ModuleRegistry {
  private modules = new Map<string, ModuleHandler>()

  register(key: string, handler: ModuleHandler) {
    this.modules.set(key, handler)
  }

  async resolve(key: string, ...args: any[]) {
    const handler = this.modules.get(key)

    if (!handler) {
      throw new Error(`Module ${key} not found`)
    }

    return handler(...args)
  }
}

export const moduleRegistry = new ModuleRegistry()
