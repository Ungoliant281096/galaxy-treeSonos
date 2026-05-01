import { Dictamen } from "../models/Dictamen.model.js";

/**
 * Crea una sesión vacía de dictamen.
 * El inspector llama esto al iniciar una evaluación en campo.
 */
export const createDictamen = async ({ inspector_id, tenant_id }) => {
  const dictamen = new Dictamen({
    inspector_id,
    tenant_id,
    estado: "en_progreso",
    historial_estados: [{ estado: "en_progreso", usuario_id: inspector_id }],
  });

  await dictamen.save();
  return dictamen;
};

/**
 * Persiste la transcripción de un campo y actualiza su valor en el documento.
 * Si el campo_id no tiene mapeo conocido, igual guarda la transcripción como evidencia.
 *
 * @param {string} dictamen_id
 * @param {string} campo_id
 * @param {object} transcripcion  { transcript, confidence, audio_s3_key, requiere_revision }
 * @param {object|null} campoResuelto  { fieldPath, valor } del campo.mapper — null si no hay mapeo
 */
export const guardarTranscripcion = async (
  dictamen_id,
  campo_id,
  transcripcion,
  campoResuelto
) => {
  const update = {
    $push: {
      transcripciones: {
        campo_id,
        transcript:        transcripcion.transcript,
        confidence:        transcripcion.confidence,
        audio_s3_key:      transcripcion.audio_s3_key,
        requiere_revision: transcripcion.requiere_revision,
        intentos:          1,
      },
    },
    $set: { updatedAt: new Date() },
  };

  // Solo actualiza el campo del dictamen si el parser obtuvo un valor válido
  if (campoResuelto?.valor !== null && campoResuelto?.valor !== undefined) {
    update.$set[campoResuelto.fieldPath] = campoResuelto.valor;
  }

  let dictamen;
  try {
    dictamen = await Dictamen.findByIdAndUpdate(dictamen_id, update, {
      new: true,
      runValidators: false, // El doc está incompleto hasta que el inspector termine
    });
  } catch (e) {
    // ObjectId inválido (ej: "dict_prueba_001" en lugar de un Mongo ID real)
    if (e.name === "CastError") throw new Error("DICTAMEN_ID_INVALIDO");
    throw e;
  }

  if (!dictamen) throw new Error("DICTAMEN_NOT_FOUND");

  return dictamen;
};

/**
 * Retorna el dictamen con sus campos actuales.
 * Usado para que el inspector vea el progreso del formulario.
 */
export const getDictamen = async (dictamen_id, tenant_id) => {
  const dictamen = await Dictamen.findOne({
    _id: dictamen_id,
    tenant_id,
  }).lean();

  if (!dictamen) throw new Error("DICTAMEN_NOT_FOUND");
  return dictamen;
};
