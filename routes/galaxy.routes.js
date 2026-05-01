import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { uploadAudio as uploadAudioMiddleware } from "../middlewares/upload.middleware.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { uploadAudio } from "../services/s3.service.js";
import { startTranscriptionJob, pollTranscriptionResult } from "../services/transcribe.service.js";
import { createDictamen, guardarTranscripcion, getDictamen } from "../services/dictamen.service.js";
import { extraerValorCampo } from "../services/campo.extractor.js";

const router = Router();

// ─── POST /dictamen ───────────────────────────────────────────────────────────
// Inicia una sesión de dictamen vacía. El inspector llama esto al llegar al árbol.
router.post("/dictamen", authMiddleware, async (req, res) => {
  const { uid: inspector_id, tenant_id } = req.usuario;

  try {
    const dictamen = await createDictamen({ inspector_id, tenant_id });
    return res.status(201).json({ dictamen_id: dictamen._id, estado: dictamen.estado });
  } catch (error) {
    console.error("[POST /dictamen]", error.message);
    return res.status(500).json({ msg: "Error al crear el dictamen" });
  }
});

// ─── GET /dictamen/:id ────────────────────────────────────────────────────────
// Retorna el estado actual del dictamen (progreso del formulario).
router.get("/dictamen/:id", authMiddleware, async (req, res) => {
  const { tenant_id } = req.usuario;

  try {
    const dictamen = await getDictamen(req.params.id, tenant_id);
    return res.json(dictamen);
  } catch (error) {
    if (error.message === "DICTAMEN_NOT_FOUND") {
      return res.status(404).json({ msg: "Dictamen no encontrado" });
    }
    console.error("[GET /dictamen/:id]", error.message);
    return res.status(500).json({ msg: "Error al obtener el dictamen" });
  }
});

// ─── POST /dictamen/audio ─────────────────────────────────────────────────────
// Recibe audio de un campo, lo transcribe y persiste en el dictamen.
router.post("/dictamen/audio", authMiddleware, uploadAudioMiddleware, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ msg: "No se subió ningún archivo de audio" });
  }

  const { dictamen_id, campo_id } = req.body;

  if (!dictamen_id || !campo_id) {
    return res.status(400).json({ msg: "dictamen_id y campo_id son requeridos" });
  }

  const { tenant_id } = req.usuario;

  if (!tenant_id) {
    return res.status(403).json({ msg: "Token sin tenant asignado" });
  }

  const ext = path.extname(req.file.originalname).replace(".", "");
  const s3Key = `${tenant_id}/dictamenes/${dictamen_id}/audio/${campo_id}_${uuidv4()}.${ext}`;
  const jobName = `dictamen-${dictamen_id}-${campo_id}-${Date.now()}`;

  try {
    // 1. Subir audio a S3
    await uploadAudio(req.file.buffer, s3Key, req.file.mimetype);

    // 2. Transcribir
    await startTranscriptionJob(s3Key, jobName);
    const { transcript, confidence } = await pollTranscriptionResult(jobName);

    const requiere_revision = confidence < 0.7;

    // 3. Claude extrae el valor estructurado del transcript
    const campoExtraido = await extraerValorCampo(campo_id, transcript);

    // 4. Persistir transcripción y campo actualizado en MongoDB
    const dictamen = await guardarTranscripcion(
      dictamen_id,
      campo_id,
      {
        transcript,
        confidence,
        audio_s3_key:      s3Key,
        requiere_revision: campoExtraido?.requiere_revision ?? requiere_revision,
      },
      campoExtraido
    );

    return res.json({
      dictamen_id,
      campo_id,
      transcript,
      confidence_audio:      confidence,
      valor_extraido:        campoExtraido?.valor ?? null,
      confidence_extraccion: campoExtraido?.confidence ?? null,
      requiere_revision:     campoExtraido?.requiere_revision ?? false,
      razonamiento:          campoExtraido?.razonamiento ?? null,
      field_actualizado:     campoExtraido?.fieldPath ?? null,
      model_usado:           campoExtraido?.model_usado ?? null,
      status:                "completed",
      audio_s3_key:          s3Key,
      dictamen_estado:       dictamen.estado,
    });
  } catch (error) {
    if (error.message === "TRANSCRIBE_TIMEOUT") {
      return res.status(202).json({
        msg: "Transcripción en proceso, se notificará el resultado",
        audio_s3_key: s3Key,
      });
    }
    if (error.message === "DICTAMEN_NOT_FOUND") {
      return res.status(404).json({ msg: "Dictamen no encontrado, crea uno primero con POST /api/galaxy/dictamen" });
    }
    if (error.message === "DICTAMEN_ID_INVALIDO") {
      return res.status(400).json({ msg: "dictamen_id inválido, debe ser el ID devuelto por POST /api/galaxy/dictamen" });
    }

    console.error("[POST /dictamen/audio]", error.message);
    return res.status(503).json({ msg: "Error al procesar el audio, intenta nuevamente" });
  }
});

export default router;
