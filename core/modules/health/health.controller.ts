import { HealthModule } from "./health.module"

export class HealthController {
  private module = new HealthModule()

  handle() {
    return this.module.getStatus()
  }
}
