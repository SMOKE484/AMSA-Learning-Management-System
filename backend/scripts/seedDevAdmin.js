// One-shot seed: creates a single admin login for a local/dev database.
// Refuses to run against anything that doesn't look like a dev/scratch DB,
// so it can't accidentally create an account in production.
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/user.js";

const SAFE_DB_NAME_PATTERN = /dev|test|scratch|verify|local/i;

const email = process.env.SEED_ADMIN_EMAIL || "admin@dev.local";
const password = process.env.SEED_ADMIN_PASSWORD || "DevAdmin123!";

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set — check backend/.env.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const dbName = mongoose.connection.name;

  if (!SAFE_DB_NAME_PATTERN.test(dbName) && process.env.ALLOW_PROD_SEED !== "true") {
    console.error(
      `Refusing to seed database "${dbName}" — it doesn't look like a dev/scratch DB ` +
      `(expected the name to contain dev/test/scratch/verify/local). ` +
      `If this really is intentional, rerun with ALLOW_PROD_SEED=true.`
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin "${email}" already exists in "${dbName}" — nothing to do.`);
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name: "Dev Admin", email, password: hashedPassword, role: "admin" });
    console.log(`Created admin "${email}" in "${dbName}".`);
    console.log(`Login with: email=${email} password=${password}`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
