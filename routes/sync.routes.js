import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { Dictamen } from "../models/Dictamen.model.js";

const router = Router();

/**
 * POST /api/galaxy/sync
 *
 * Recibe un array de dictámenes creados offline y los persiste sin duplicados.
 * La idempotency key es el _id generado en el cliente (UUID v4 convertido a string).
 *
 * Body: { dictamenes: [{ _id, campos... }] }
 *
 * DDIA Cap. 7-9: exactly-once delivery vía upsert por _id
 */
router.post("/sync", authMiddleware, async (req, res) => {
  const { dictamenes } = req.body;
  const { uid: inspector_id, tenant_id } = req.usuario;

  if (!Array.isArray(dictamenes) || dictamenes.length === 0) {
    return res.status(400).json({ msg: "Se requiere un array de dictamenes no vacío" });
  }

  if (dictamenes.length > 50) {
    return res.status(400).json({ msg: "Máximo 50 dictámenes por sync" });
  }

  const resultados = await Promise.allSettled(
    dictamenes.map(async ({ _id, ...campos }) => {
      if (!_id) throw new Error("Dictamen sin _id — no se puede garantizar idempotency");

      // upsert: si ya existe el _id, no sobreescribe. Si no existe, lo crea.
      // setOnInsert aplica solo en el INSERT, nunca en el UPDATE → idempotente
      await Dictamen.findOneAndUpdate(
        { _id, tenant_id },
        {
          $setOnInsert: {
            _id,
            inspector_id,
            tenant_id,
            estado: "en_progreso",
            ...campos,
            historial_estados: [{ estado: "en_progreso", usuario_id: inspector_id }],
          },
        },
        { upsert: true, new: true }
      );

      return _id;
    })
  );

  const exitosos = resultados
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);

  const fallidos = resultados
    .filter((r) => r.status === "rejected")
    .map((r, i) => ({ index: i, error: r.reason.message }));

  return res.json({
    sincronizados: exitosos.length,
    fallidos:      fallidos.length,
    detalle:       fallidos,
  });
});

export default router;
