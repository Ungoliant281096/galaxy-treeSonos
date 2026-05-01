import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { procesarMensaje } from "../services/chatbot.service.js";
import { createDictamen } from "../services/dictamen.service.js";

const router = Router();

/**
 * POST /api/galaxy/chat
 *
 * Endpoint principal del chatbot. Acepta texto (transcript o escrito).
 * Para audio: primero pasa por POST /dictamen/audio, luego envía el transcript aquí.
 *
 * Body: { dictamen_id?, mensaje }
 * - Si no hay dictamen_id, crea uno nuevo automáticamente.
 */
router.post("/chat", authMiddleware, async (req, res) => {
  const { mensaje, dictamen_id: dictamenIdEntrada } = req.body;
  const inspector = req.usuario; // { uid, tenant_id, role }

  if (!mensaje?.trim()) {
    return res.status(400).json({ msg: "El campo mensaje es requerido" });
  }

  try {
    // Auto-crear dictamen si el inspector no tiene uno activo
    let dictamen_id = dictamenIdEntrada;
    if (!dictamen_id) {
      const nuevo = await createDictamen({
        inspector_id: inspector.uid,
        tenant_id:    inspector.tenant_id,
      });
      dictamen_id = nuevo._id.toString();
    }

    const resultado = await procesarMensaje(dictamen_id, mensaje.trim(), inspector);

    return res.json({ dictamen_id, ...resultado });
  } catch (error) {
    console.error("[POST /chat]", error.message);
    return res.status(500).json({ msg: "Error en el chatbot, intenta nuevamente" });
  }
});

export default router;
