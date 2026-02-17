import { moduleRegistry } from "../../module-registry"

export class HealthModule {
  getStatus() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    }
  }
}

const healthModule = new HealthModule()

moduleRegistry.register("health", () => healthModule.getStatus())
