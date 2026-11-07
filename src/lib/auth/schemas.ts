import { z } from "zod";

export const signInSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(72),
});

// Admin is deliberately absent: it can never be chosen at sign-up.
export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(120, "Use 120 characters or fewer"),
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(10, "Use at least 10 characters").max(72, "Use 72 characters or fewer"),
  role: z.enum(["trainee", "psychologist"], { error: "Choose how you will use AeroMind" }),
});
