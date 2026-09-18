import type { Config } from "../env.js";
import { MockJevClient } from "./mock.js";
import { RealJevClient } from "./real.js";
import type { JevClient } from "./types.js";

export function createJevClient(config: Config): JevClient {
  if (config.mockJev) return new MockJevClient({ rateLimitRate: config.mockRateLimitRate });
  if (!config.typesafeApiKey) {
    throw new Error("TYPESAFE_API_KEY is not set. Add it to .env, or set MOCK_JEV=true to run without quota.");
  }
  return new RealJevClient(config.typesafeApiKey, config.jevModel);
}

export type { JevClient } from "./types.js";
