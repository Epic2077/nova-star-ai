import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(2, "Full name is required."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;
