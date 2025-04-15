
import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, ".env.local") });

export default {
  dialect: "postgresql",
  schema: "./utils/schema.jsx",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.NEXT_PUBLIC_DATABASE_URL,
  },
  verbose: true,
  strict: true,
};