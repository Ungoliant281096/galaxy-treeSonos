/**
 * Mapea cada campo_id del formulario NADF-001-RNAT-2015 a:
 *   - fieldPath: ruta dot-notation en el documento Dictamen
 *   - parse:     convierte el transcript crudo al tipo correcto
 *
 * El parser es intencionalmente simple (regex + keywords).
 * Claude (Bedrock) reemplazará esta lógica en Sprint 2.
 */

const extractNumber = (text) => {
  const match = text.match(/[\d]+([.,]\d+)?/);
  if (!match) return null;
  return parseFloat(match[0].replace(",", "."));
};

const extractEnum = (text, options) => {
  const lower = text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return options.find((opt) => lower.includes(opt)) ?? null;
};

// ─── Mapa completo del formulario ────────────────────────────────────────────

export const CAMPO_MAP = {
  // ── Sección 3: Características ──────────────────────────────────────────
  altura_total: {
    fieldPath: "caracteristicas.altura_total_m",
    parse: extractNumber,
  },
  diametro_tronco: {
    fieldPath: "caracteristicas.diametro_tronco_130cm",
    parse: extractNumber,
  },
  ancho_copa: {
    fieldPath: "caracteristicas.ancho_copa_promedio_m",
    parse: extractNumber,
  },
  largo_copa: {
    fieldPath: "caracteristicas.largo_copa_m",
    parse: extractNumber,
  },
  distancia_follaje: {
    fieldPath: "caracteristicas.distancia_suelo_follaje_m",
    parse: extractNumber,
  },
  nombre_comun: {
    fieldPath: "caracteristicas.nombre_comun",
    parse: (text) => text.trim(),
  },
  nombre_genero: {
    fieldPath: "caracteristicas.nombre_cientifico.genero",
    parse: (text) => text.trim(),
  },
  nombre_especie: {
    fieldPath: "caracteristicas.nombre_cientifico.especie",
    parse: (text) => text.trim(),
  },
  tipo_hoja: {
    fieldPath: "caracteristicas.tipo_hoja",
    parse: (text) => extractEnum(text, ["caducifolio", "perennifolio"]),
  },

  // ── Sección 2: Localización ─────────────────────────────────────────────
  tipo_localizacion: {
    fieldPath: "localizacion.tipo",
    parse: (text) =>
      extractEnum(text, [
        "banqueta", "camellon", "glorieta", "parque",
        "arriate", "plaza", "propiedad privada", "obra civil",
      ])?.replace(" ", "_"),
  },
  calle: {
    fieldPath: "localizacion.calle_num",
    parse: (text) => text.trim(),
  },
  colonia: {
    fieldPath: "localizacion.colonia",
    parse: (text) => text.trim(),
  },
  entre_calle: {
    fieldPath: "localizacion.entre_calle",
    parse: (text) => text.trim(),
  },
  y_calle: {
    fieldPath: "localizacion.y_calle",
    parse: (text) => text.trim(),
  },
  observaciones_localizacion: {
    fieldPath: "localizacion.observaciones",
    parse: (text) => text.trim(),
  },

  // ── Sección 1: Solicitante ──────────────────────────────────────────────
  actividad_solicitada: {
    fieldPath: "solicitante.actividad_solicitada",
    parse: (text) => text.trim(),
  },
  justificacion: {
    fieldPath: "solicitante.justificacion",
    parse: (text) => text.trim(),
  },

  // ── Sección 8: Valoración ───────────────────────────────────────────────
  condicion_general: {
    fieldPath: "valoracion.condicion_general",
    parse: (text) =>
      extractEnum(text, [
        "muy bueno", "bueno", "declinante incipiente",
        "declinante severo", "muerto",
      ])?.replace(/ /g, "_"),
  },
  expectativa_vida: {
    fieldPath: "valoracion.expectativa_vida",
    parse: (text) => {
      const n = extractNumber(text);
      if (!n) return null;
      if (n <= 5)  return "5_anios";
      if (n <= 20) return "6_a_20";
      if (n <= 40) return "21_a_40";
      return "mas_40";
    },
  },

  // ── Sección 9: Manejo ───────────────────────────────────────────────────
  observaciones_manejo: {
    fieldPath: "manejo.observaciones_generales",
    parse: (text) => text.trim(),
  },
};

/**
 * Resuelve campo_id → { fieldPath, valor }
 * Retorna null si el campo_id no existe en el mapa.
 */
export const resolverCampo = (campo_id, transcript) => {
  const entrada = CAMPO_MAP[campo_id];
  if (!entrada) return null;

  const valor = entrada.parse(transcript);
  return { fieldPath: entrada.fieldPath, valor };
};
