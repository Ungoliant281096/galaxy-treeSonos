import { extraerCampo, MODELS } from "./bedrock.service.js";

/**
 * Catálogo de campos del formulario NADF-001-RNAT-2015.
 * Cada entrada define:
 *   - descripcion:    contexto que se pasa a Claude
 *   - fieldPath:      ruta dot-notation en el documento Dictamen
 *   - valoresValidos: lista de enums (vacío para campos libres/numéricos)
 *   - modelo:         haiku (default) o sonnet para casos complejos
 */
const CATALOGO = {
  // ── Sección 3: Características ────────────────────────────────────────────
  altura_total: {
    descripcion:    "Altura total del árbol en metros",
    fieldPath:      "caracteristicas.altura_total_m",
    valoresValidos: [],
  },
  diametro_tronco: {
    descripcion:    "Diámetro del tronco medido a 1.30 metros del nivel del suelo, en centímetros",
    fieldPath:      "caracteristicas.diametro_tronco_130cm",
    valoresValidos: [],
  },
  ancho_copa: {
    descripcion:    "Ancho promedio de la copa del árbol en metros",
    fieldPath:      "caracteristicas.ancho_copa_promedio_m",
    valoresValidos: [],
  },
  largo_copa: {
    descripcion:    "Largo de la copa del árbol en metros",
    fieldPath:      "caracteristicas.largo_copa_m",
    valoresValidos: [],
  },
  distancia_follaje: {
    descripcion:    "Distancia desde el suelo hasta el inicio del follaje en metros",
    fieldPath:      "caracteristicas.distancia_suelo_follaje_m",
    valoresValidos: [],
  },
  nombre_comun: {
    descripcion:    "Nombre común del árbol (ej: fresno, pirul, jacaranda)",
    fieldPath:      "caracteristicas.nombre_comun",
    valoresValidos: [],
  },
  nombre_genero: {
    descripcion:    "Género científico del árbol (ej: Fraxinus, Schinus, Jacaranda)",
    fieldPath:      "caracteristicas.nombre_cientifico.genero",
    valoresValidos: [],
    modelo:         MODELS.sonnet, // Nomenclatura científica requiere más precisión
  },
  nombre_especie: {
    descripcion:    "Especie científica del árbol (ej: uhdei, molle, mimosifolia)",
    fieldPath:      "caracteristicas.nombre_cientifico.especie",
    valoresValidos: [],
    modelo:         MODELS.sonnet,
  },
  tipo_hoja: {
    descripcion:    "Tipo de hoja del árbol según su ciclo de vida",
    fieldPath:      "caracteristicas.tipo_hoja",
    valoresValidos: ["caducifolio", "perennifolio"],
  },

  // ── Sección 2: Localización ───────────────────────────────────────────────
  tipo_localizacion: {
    descripcion:    "Lugar donde se ubica el árbol dentro del espacio urbano",
    fieldPath:      "localizacion.tipo",
    valoresValidos: [
      "banqueta", "camellón", "glorieta", "parque",
      "arriate", "plaza", "propiedad_privada", "obra_civil", "otro",
    ],
  },
  calle: {
    descripcion:    "Calle y número donde se ubica el árbol",
    fieldPath:      "localizacion.calle_num",
    valoresValidos: [],
  },
  colonia: {
    descripcion:    "Colonia, pueblo o barrio donde se ubica el árbol",
    fieldPath:      "localizacion.colonia",
    valoresValidos: [],
  },
  entre_calle: {
    descripcion:    "Primera calle de referencia entre la que se ubica el árbol",
    fieldPath:      "localizacion.entre_calle",
    valoresValidos: [],
  },
  y_calle: {
    descripcion:    "Segunda calle de referencia entre la que se ubica el árbol",
    fieldPath:      "localizacion.y_calle",
    valoresValidos: [],
  },
  observaciones_localizacion: {
    descripcion:    "Observaciones adicionales sobre la ubicación del árbol",
    fieldPath:      "localizacion.observaciones",
    valoresValidos: [],
  },

  // ── Sección 1: Solicitante ────────────────────────────────────────────────
  actividad_solicitada: {
    descripcion:    "Actividad que solicita realizar el solicitante (derribo, poda, trasplante, etc.)",
    fieldPath:      "solicitante.actividad_solicitada",
    valoresValidos: [],
    modelo:         MODELS.sonnet,
  },
  justificacion: {
    descripcion:    "Justificación del solicitante para la actividad solicitada",
    fieldPath:      "solicitante.justificacion",
    valoresValidos: [],
    modelo:         MODELS.sonnet,
  },

  // ── Sección 7: Estructura ─────────────────────────────────────────────────
  condicion_estructura: {
    descripcion:    "Condición estructural general del árbol evaluada por el técnico",
    fieldPath:      "estructura.condicion",
    valoresValidos: ["irrecuperable", "susceptible_mejora", "buena", "muy_buena"],
  },
  inclinacion_grados: {
    descripcion:    "Grado de inclinación del tronco en grados (0 = recto, 90 = horizontal)",
    fieldPath:      "estructura.tronco_inclinacion_grados",
    valoresValidos: [],
  },

  // ── Sección 8: Valoración ─────────────────────────────────────────────────
  condicion_general: {
    descripcion:    "Condición general del árbol según criterios NADF",
    fieldPath:      "valoracion.condicion_general",
    valoresValidos: [
      "muy_bueno", "bueno", "declinante_incipiente", "declinante_severo", "muerto",
    ],
    modelo: MODELS.sonnet,
  },
  expectativa_vida: {
    descripcion:    "Expectativa de vida del árbol en años",
    fieldPath:      "valoracion.expectativa_vida",
    valoresValidos: ["5_anios", "6_a_20", "21_a_40", "mas_40"],
  },

  // ── Sección 9: Manejo ─────────────────────────────────────────────────────
  observaciones_manejo: {
    descripcion:    "Observaciones generales sobre el manejo y conclusiones del dictamen",
    fieldPath:      "manejo.observaciones_generales",
    valoresValidos: [],
    modelo:         MODELS.sonnet,
  },
};

/**
 * Extrae el valor de un campo usando Claude (Bedrock) o el mock en dev.
 * Si el campo_id no existe en el catálogo, retorna null.
 *
 * @returns {{ fieldPath, valor, confidence, requiere_revision, razonamiento } | null}
 */
export const extraerValorCampo = async (campo_id, transcript) => {
  const entrada = CATALOGO[campo_id];
  if (!entrada) return null;

  const resultado = await extraerCampo({
    campo_id,
    descripcion:    entrada.descripcion,
    transcript,
    valoresValidos: entrada.valoresValidos,
    model:          entrada.modelo ?? MODELS.haiku,
  });

  return {
    fieldPath:         entrada.fieldPath,
    valor:             resultado.valor,
    confidence:        resultado.confidence,
    requiere_revision: resultado.confidence < 0.7,
    razonamiento:      resultado.razonamiento,
    model_usado:       resultado.model_usado,
  };
};

export { CATALOGO };
