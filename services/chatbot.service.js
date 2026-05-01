import { extraerValorCampo, CATALOGO } from "./campo.extractor.js";
import { guardarTranscripcion } from "./dictamen.service.js";
import { getSession, saveSession, crearSession } from "./session.service.js";

// Orden oficial de preguntas según el formulario NADF-001-RNAT-2015
const FLUJO_PREGUNTAS = [
  // Sección 2: Localización
  { campo_id: "tipo_localizacion", pregunta: "¿Dónde se encuentra el árbol? (banqueta, camellón, parque, glorieta...)" },
  { campo_id: "calle",             pregunta: "¿Cuál es la calle y número?" },
  { campo_id: "colonia",           pregunta: "¿Cuál es la colonia o barrio?" },
  { campo_id: "entre_calle",       pregunta: "¿Entre qué calles se ubica?" },
  { campo_id: "y_calle",           pregunta: "¿Y cuál es la segunda calle de referencia?" },
  // Sección 3: Características
  { campo_id: "nombre_comun",      pregunta: "¿Cuál es el nombre común del árbol?" },
  { campo_id: "nombre_genero",     pregunta: "¿Cuál es el género científico?" },
  { campo_id: "nombre_especie",    pregunta: "¿Cuál es la especie?" },
  { campo_id: "tipo_hoja",         pregunta: "¿El árbol es caducifolio o perennifolio?" },
  { campo_id: "altura_total",      pregunta: "¿Cuál es la altura total del árbol en metros?" },
  { campo_id: "diametro_tronco",   pregunta: "¿Cuál es el diámetro del tronco a 1.30 metros del suelo, en centímetros?" },
  { campo_id: "ancho_copa",        pregunta: "¿Cuál es el ancho promedio de la copa en metros?" },
  { campo_id: "largo_copa",        pregunta: "¿Cuál es el largo de la copa en metros?" },
  { campo_id: "distancia_follaje", pregunta: "¿A qué altura del suelo inicia el follaje?" },
  // Sección 7: Estructura
  { campo_id: "condicion_estructura", pregunta: "¿Cuál es la condición estructural del árbol? (irrecuperable, susceptible de mejora, buena, muy buena)" },
  { campo_id: "inclinacion_grados",   pregunta: "¿Cuántos grados de inclinación tiene el tronco? (0 si está recto)" },
  // Sección 8: Valoración
  { campo_id: "condicion_general",  pregunta: "¿Cuál es la condición general del árbol? (muy bueno, bueno, declinante incipiente, declinante severo, muerto)" },
  { campo_id: "expectativa_vida",   pregunta: "¿Cuántos años de expectativa de vida estimas para el árbol?" },
  // Sección 9: Conclusiones
  { campo_id: "observaciones_manejo", pregunta: "¿Cuáles son tus observaciones finales y recomendación de manejo?" },
];

const MENSAJE_BIENVENIDA = `Hola. Voy a guiarte para completar el dictamen técnico. Responde cada pregunta en voz o escrito. Podemos empezar cuando quieras.`;

/**
 * Procesa un mensaje del inspector y devuelve la respuesta del bot.
 *
 * @param {string} dictamen_id
 * @param {string} texto         - Transcript del audio o texto directo
 * @param {object} inspector     - { uid, tenant_id }
 * @returns {{ respuesta, campo_guardado, siguiente_pregunta, progreso, completado }}
 */
export const procesarMensaje = async (dictamen_id, texto, inspector) => {
  // Cargar o crear la sesión
  let session = await getSession(dictamen_id);
  if (!session) {
    session = await crearSession(dictamen_id, {
      tenant_id:    inspector.tenant_id,
      inspector_id: inspector.uid,
    });
    await saveSession(dictamen_id, session);
    return {
      respuesta:         MENSAJE_BIENVENIDA,
      campo_guardado:    null,
      siguiente_pregunta: FLUJO_PREGUNTAS[0].pregunta,
      progreso:          { completados: 0, total: FLUJO_PREGUNTAS.length },
      completado:        false,
    };
  }

  // Determinar qué campo está respondiendo según el flujo
  const campoPendiente = FLUJO_PREGUNTAS.find(
    (p) => !session.campos_completados.includes(p.campo_id)
  );

  if (!campoPendiente) {
    return {
      respuesta:         "El dictamen ya está completo. Puedes revisarlo y enviarlo para aprobación.",
      campo_guardado:    null,
      siguiente_pregunta: null,
      progreso:          { completados: FLUJO_PREGUNTAS.length, total: FLUJO_PREGUNTAS.length },
      completado:        true,
    };
  }

  // Claude extrae el valor del transcript
  const campoExtraido = await extraerValorCampo(campoPendiente.campo_id, texto);

  let respuesta;
  let campoGuardado = null;

  if (!campoExtraido || campoExtraido.valor === null) {
    // Claude no pudo extraer — repregunta
    respuesta = `No entendí bien. ${campoPendiente.pregunta}`;
  } else if (campoExtraido.requiere_revision) {
    // Confidence bajo — confirmar con el inspector
    respuesta = `Entendí "${campoExtraido.valor}" para ${campoPendiente.campo_id}. ¿Es correcto? Responde sí o no.`;
    // Guardar igual pero marcado para revisión
    await guardarTranscripcion(
      dictamen_id,
      campoPendiente.campo_id,
      { transcript: texto, confidence: campoExtraido.confidence, audio_s3_key: null, requiere_revision: true },
      campoExtraido
    );
    campoGuardado = { campo_id: campoPendiente.campo_id, valor: campoExtraido.valor, requiere_revision: true };
  } else {
    // Extracción exitosa — guardar y avanzar
    await guardarTranscripcion(
      dictamen_id,
      campoPendiente.campo_id,
      { transcript: texto, confidence: campoExtraido.confidence, audio_s3_key: null, requiere_revision: false },
      campoExtraido
    );
    session.campos_completados.push(campoPendiente.campo_id);
    campoGuardado = { campo_id: campoPendiente.campo_id, valor: campoExtraido.valor, requiere_revision: false };
    respuesta = `Registré ${campoPendiente.campo_id}: ${campoExtraido.valor}.`;
  }

  // Determinar siguiente pregunta
  const siguiente = FLUJO_PREGUNTAS.find(
    (p) => !session.campos_completados.includes(p.campo_id)
  );

  if (siguiente) respuesta += ` ${siguiente.pregunta}`;

  // Actualizar historial en Redis
  session.historial.push(
    { role: "user",      content: texto },
    { role: "assistant", content: respuesta }
  );
  // Mantener solo los últimos 20 turnos para no crecer indefinidamente
  if (session.historial.length > 40) session.historial = session.historial.slice(-40);

  await saveSession(dictamen_id, session);

  return {
    respuesta,
    campo_guardado:    campoGuardado,
    siguiente_pregunta: siguiente?.pregunta ?? null,
    progreso: {
      completados: session.campos_completados.length,
      total:       FLUJO_PREGUNTAS.length,
    },
    completado: !siguiente,
  };
};
