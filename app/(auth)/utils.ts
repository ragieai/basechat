import { z, ZodRawShape } from "zod";

const passwordSchema = z.object({
  password: z.string().min(6, { message: "Password is required and must be at least 6 characters" }),
  confirm: z.string(),
});

export function extendPasswordSchema(schema: ZodRawShape) {
  return passwordSchema.extend(schema).refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
}
