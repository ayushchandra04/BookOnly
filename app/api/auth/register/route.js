import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { jsonError, ApiError } from "@/lib/apiAuth";

const ALLOWED_SELF_SIGNUP_ROLES = ["customer", "organiser"];

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const role = ALLOWED_SELF_SIGNUP_ROLES.includes(body.role) ? body.role : "customer";

    if (!name || !email || !password) {
      throw new ApiError(400, "name, email, and password are required");
    }
    if (password.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "An account with this email already exists");

    const passwordHash = await hashPassword(password);
    const user = await User.create({ name, email, passwordHash, role });

    const token = signSession({
      sub: String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    return jsonError(err);
  }
}
