import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";
import { jsonError, ApiError } from "@/lib/apiAuth";

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(401, "Invalid email or password");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new ApiError(401, "Invalid email or password");

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
