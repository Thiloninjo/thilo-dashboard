import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

export const CONFIG = {
  port: parseInt(process.env.PORT || "3001"),
  vaultPath: process.env.VAULT_PATH || "",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/auth/google/callback",
    tokenPath: resolve(__dirname, "../../google-token.json"),
  },
  todoist: {
    apiToken: process.env.TODOIST_API_TOKEN || "",
  },
  habitica: {
    userId: process.env.HABITICA_USER_ID || "",
    apiToken: process.env.HABITICA_API_TOKEN || "",
  },
};
