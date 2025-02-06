import { Ragie } from "ragie";

import * as settings from "./settings";

export function getRagieClient() {
  return new Ragie({ auth: settings.RAGIE_API_KEY, serverURL: settings.RAGIE_API_BASE_URL });
}
