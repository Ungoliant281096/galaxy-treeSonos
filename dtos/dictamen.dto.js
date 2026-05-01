import { z } from "zod";

export const crearDictamenDto = z.object({
  // Campos opcionales al crear — el chatbot los completa después
  tipo_elemento: z.enum(["arbol", "luminaria", "banqueta", "otro"]).optional(),
  folio: z.object({
    judiaps: z.string().optional(),
    degu:    z.string().optional(),
    dgsu:    z.string().optional(),
    coy:     z.string().optional(),
    sac:     z.string().optional(),
    suac:    z.string().optional(),
  }).optional(),
});

export const filtrosDictamenDto = z.object({
  estado:     z.enum(["borrador", "en_progreso", "completado", "aprobado", "rechazado"]).optional(),
  desde:      z.string().datetime().optional(),
  hasta:      z.string().datetime().optional(),
  inspector:  z.string().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export const cambiarEstadoDto = z.object({
  estado:      z.enum(["completado", "aprobado", "rechazado"]),
  observacion: z.string().optional(),
});
