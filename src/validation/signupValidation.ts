import { z } from "zod";

export const signupSchema = z
  .object({
    name: z
      .string()
      .transform((v) => v.trim())
      .pipe(z.string().min(2, "Full name is required.")),
    email: z
      .string()
      .transform((v) => v.trim().toLowerCase())
      .pipe(z.string().email("Enter a valid email address.")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number.")
      .regex(
        /[^A-Za-z0-9]/,
        "Password must contain at least one special character.",
      ),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;
