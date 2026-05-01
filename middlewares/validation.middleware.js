import { ZodError } from "zod";
import bcrypt from "bcrypt";

export const validationMiddleware = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      console.log("[SchemaValidation] - True");
      next();
    } catch (error) {
      console.log("[SchemaValidation] - False");

      if (error.errors && Array.isArray(error.errors)) {
        const errorMessages = error.errors.map((err) => ({
          campo: err.path.join("."),
          mensaje: err.message,
        }));

        return res.status(400).json({
          status: "error",
          errors: errorMessages,
        });
      }

      console.error("Error no manejado en validación:", error);

      return res.status(500).json({
        status: "error",
        message: error.message || "Error interno del servidor",
      });
    }
  };
};
