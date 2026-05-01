import { z } from "zod";

export const userSchema = z.object({
  name: z.string({
    required_error: "El nombre es obligatorio",
    invalid_type_error: "El nombre debe ser un texto",
  }),
  email: z.string().email({
    required_error: "El correo es obligatorio",
    invalid_type_error: "El correo debe ser un texto",
  }),
  username: z.string({
    required_error: "El username es obligatorio",
    invalid_type_error: "El username debe ser un texto",
  }),
  age: z
    .number({
      required_error: "La edad es obligatoria",
      invalid_type_error: "La edad debe ser un número",
    })
    .min(18),
  country: z.string({
    required_error: "El país es obligatorio",
    invalid_type_error: "El país debe ser un texto",
  }),
  phone: z
    .string({
      required_error: "El telefono es obligatorio",
      invalid_type_error: "El telefono debe ser un texto",
    })
    .min(9)
    .max(10),
  password: z
    .string({
      required_error: "La password es obligatoria",
      invalid_type_error: "La password debe ser un texto",
    })
    .min(6),
  role: z.enum(["admin", "inspector", "supervisor"]),
  tenant_id: z.string({ required_error: "El tenant es obligatorio" }),
});
