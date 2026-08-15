"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { guard, clean, requireText } from "./_shared";

// ---------------------------------------------------------------------------
//  Password validation rules
//  - Min 8 characters
//  - At least 1 special character
//  - At least 2 digits
// ---------------------------------------------------------------------------
function validatePassword(pw: string): string {
  if (pw.length < 8) throw new Error("Password must be at least 8 characters.");
  if (!/[^A-Za-z0-9]/.test(pw))
    throw new Error("Password must contain at least 1 special character.");
  const digitCount = (pw.match(/\d/g) || []).length;
  if (digitCount < 2)
    throw new Error("Password must contain at least 2 numbers.");
  return pw;
}

/** Register a new user with email + password. */
export async function registerUser(formData: FormData) {
  return guard(async () => {
    const name = requireText(formData.get("name"), "Full name");
    const email = clean(formData.get("email")).toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Please enter a valid email address.");

    const password = clean(formData.get("password"));
    const confirmPassword = clean(formData.get("confirmPassword"));
    validatePassword(password);
    if (password !== confirmPassword) throw new Error("Passwords do not match.");

    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error("An account with this email already exists.");

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: "student", // default; changed during onboarding
        onboarded: false,
        emailVerified: new Date(),
      },
    });
  });
}
