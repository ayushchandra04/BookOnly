// Creates the first admin account. Public /api/auth/register only allows
// signing up as customer or organiser, so this is how an admin gets created.
//
// Usage: node --env-file=.env.local scripts/seedAdmin.js "Admin Name" admin@example.com "somePassword123"
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../lib/models/User.js";

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error('Usage: node --env-file=.env.local scripts/seedAdmin.js "Admin Name" admin@example.com "password123"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set — pass --env-file=.env.local or export it first");
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role})`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await User.create({ name, email: email.toLowerCase(), passwordHash, role: "admin" });
  console.log(`Created admin user: ${admin.email} (${admin._id})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
