import mongoose from "mongoose";

const { Schema } = mongoose;

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

const transcripcionSchema = new Schema(
  {
    campo_id:          { type: String, required: true },
    transcript:        { type: String, required: true },
    confidence:        { type: Number, min: 0, max: 1 },
    audio_s3_key:      { type: String },
    intentos:          { type: Number, default: 1, max: 3 },
    requiere_revision: { type: Boolean, default: false },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const fotoSchema = new Schema(
  {
    s3_key:      { type: String, required: true },
    descripcion: { type: String },
    campo_id:    { type: String },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const historialEstadoSchema = new Schema(
  {
    estado:       { type: String, required: true },
    usuario_id:   { type: Schema.Types.ObjectId, ref: "Galaxy_Users" },
    observacion:  { type: String },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

// ─── Main schema ─────────────────────────────────────────────────────────────

const dictamenSchema = new Schema(
  {
    // ── Control y trazabilidad ──────────────────────────────────────────────
    tenant_id: {
      type: String, required: true, lowercase: true, trim: true,
    },
    inspector_id: {
      type: Schema.Types.ObjectId, ref: "Galaxy_Users", required: true,
    },
    estado: {
      type: String,
      enum: ["borrador", "en_progreso", "completado", "aprobado", "rechazado"],
      default: "borrador",
    },
    historial_estados: [historialEstadoSchema],

    // Sugerencia Consultor Senior: versión de norma para validez legal futura
    norma_aplicada: {
      clave:              { type: String, default: "NADF-001-RNAT-2015" },
      version_formulario: { type: String, default: "v1.0" },
      vigente_desde:      { type: Date, default: new Date("2015-01-01") },
      vigente_hasta:      { type: Date, default: null },
    },

    // Referencias internas del expediente (folio)
    folio: {
      judiaps: { type: String, trim: true },
      degu:    { type: String, trim: true },
      dgsu:    { type: String, trim: true },
      coy:     { type: String, trim: true },
      sac:     { type: String, trim: true },
      suac:    { type: String, trim: true },
    },

    fecha_evaluacion: {
      dia:  { type: Number, min: 1, max: 31 },
      mes:  { type: Number, min: 1, max: 12 },
      anio: { type: Number },
      hora: { type: String },
    },

    // ── Sección 1: Datos del solicitante ───────────────────────────────────
    solicitante: {
      domicilio: {
        calle_num: { type: String, trim: true },
        colonia:   { type: String, trim: true },
        alcaldia:  { type: String, trim: true },
        cp:        { type: String, trim: true },
      },
      actividad_solicitada: { type: String, trim: true },
      justificacion:        { type: String, trim: true },
    },

    // ── Sección 2: Localización del árbol ──────────────────────────────────
    localizacion: {
      tipo: {
        type: String,
        enum: [
          "banqueta", "camellón", "glorieta", "parque",
          "arriate", "plaza", "propiedad_privada", "obra_civil", "otro",
        ],
      },
      tipo_otro:   { type: String, trim: true },
      calle_num:   { type: String, trim: true },
      colonia:     { type: String, trim: true },
      entre_calle: { type: String, trim: true },
      y_calle:     { type: String, trim: true },
      alcaldia:    { type: String, trim: true },
      // GeoJSON — habilita índice 2dsphere para consultas geoespaciales
      // Sin default: el campo solo existe cuando el inspector registra su GPS
      coordenadas: {
        type:        { type: String, enum: ["Point"] },
        coordinates: { type: [Number] },
      },
      observaciones: { type: String, trim: true },
    },

    // ── Sección 3: Características del árbol ───────────────────────────────
    caracteristicas: {
      nombre_comun: { type: String, trim: true },
      nombre_cientifico: {
        genero:   { type: String, trim: true },
        especie:  { type: String, trim: true },
        variedad: { type: String, trim: true },
      },
      tipo_hoja:                { type: String, enum: ["caducifolio", "perennifolio"] },
      altura_total_m:           { type: Number, min: 0 },
      distancia_suelo_follaje_m:{ type: Number, min: 0 },
      ancho_copa_promedio_m:    { type: Number, min: 0 },
      largo_copa_m:             { type: Number, min: 0 },
      // Medición estándar de la norma: a 1.30m del nivel del suelo
      diametro_tronco_130cm:    { type: Number, min: 0 },
    },

    // ── Sección 4: Interferencias ───────────────────────────────────────────
    interferencias: {
      follaje: {
        type: [String],
        enum: ["inmueble", "mobiliario", "transito_vehicular", "camaras_seguridad"],
      },
      tronco: {
        type: [String],
        enum: ["cables_electricos", "luminarias", "peatonal", "otros"],
      },
      raices: {
        type: [String],
        enum: ["registros", "senales_transito"],
      },
      observaciones: { type: String, trim: true },
    },

    // ── Sección 5: Descripción del sitio ───────────────────────────────────
    descripcion_sitio: {
      rodeado: {
        type: [String],
        enum: [
          "transito_vehicular", "pasto", "arboles_plantas",
          "pavimento", "registro", "residuos_solidos",
        ],
      },
      riego:              { type: Boolean },
      compactacion_suelo: { type: String, enum: ["ligero", "moderado", "severo", null] },
    },

    // ── Sección 6: Estado fitosanitario ────────────────────────────────────
    estado_fitosanitario: {
      hojas: {
        biotico:      { type: [String], enum: ["enfermedades", "plagas"] },
        abiotico:     { type: [String], enum: ["marchitez", "granizo", "helada", "clorosis"] },
        observaciones:{ type: String, trim: true },
      },
      ramas: {
        biotico:      { type: [String], enum: ["enfermedades", "plagas", "muerdago"] },
        abiotico:     { type: [String], enum: ["muertas", "caidas", "desprendidas", "desmoche", "heridas", "vandalismo"] },
        observaciones:{ type: String, trim: true },
      },
      tronco: {
        biotico:      { type: [String], enum: ["enfermedades", "plagas"] },
        abiotico:     { type: [String], enum: ["vandalismo", "estrangulamiento", "cavidades", "pudricion", "heridas"] },
        observaciones:{ type: String, trim: true },
      },
      raices: {
        biotico:      { type: [String], enum: ["enfermedades", "plagas"] },
        abiotico:     { type: [String], enum: ["expuestas", "cortadas", "reprimidas", "estranguladas", "heridas"] },
        observaciones:{ type: String, trim: true },
      },
    },

    // ── Sección 7: Estructura del árbol ────────────────────────────────────
    estructura: {
      condicion: {
        type: String,
        enum: ["irrecuperable", "susceptible_mejora", "buena", "muy_buena"],
      },
      // Todos los problemas estructurales como array de strings
      problemas: {
        type: [String],
        enum: [
          "copa_mal_equilibrada", "apice_terminal_multiple", "ramas_largas",
          "troncos_multiples", "corteza_incluida", "troncos_codominantes",
          "chupones", "ramas_codominantes", "cola_de_leon",
        ],
      },
      tronco_inclinacion_grados: { type: Number, min: 0, max: 360 },
    },

    // ── Sección 8: Valoración ───────────────────────────────────────────────
    valoracion: {
      expectativa_vida: {
        type: String,
        enum: ["5_anios", "6_a_20", "21_a_40", "mas_40"],
      },
      presencia_arboles_100m: {
        type: String,
        enum: ["mas_300", "200_a_300", "51_a_199", "50_o_menos"],
      },
      otros_valores: {
        type: [String],
        enum: ["cientifico", "historico", "social_cultural", "otros"],
      },
      condicion_general: {
        type: String,
        enum: ["muy_bueno", "bueno", "declinante_incipiente", "declinante_severo", "muerto"],
      },
    },

    // ── Sección 9: Manejo y conclusiones ───────────────────────────────────
    manejo: {
      alternativas_derribo: {
        type: [String],
        enum: ["trasplante", "adecuacion_constructiva", "calendarizacion_podas"],
      },
      derribo: {
        aplica: { type: Boolean, default: false },
        causales: {
          type: [String],
          enum: [
            "riesgo_personas_bienes",
            "afectacion_infraestructura",
            "riesgo_patrimonio",
            "mejoramiento_area_verde",
            "saneamiento_arboles_aledanos",
            "obra_publica_privada",
          ],
        },
        observaciones: { type: String, trim: true },
      },
      podas: {
        aplica: { type: Boolean, default: false },
        tipos: {
          type: [String],
          enum: [
            "limpieza",           // 6.4.2.1.1
            "restauracion_copa",  // 6.4.2.1.2
            "aclareo_copa",       // 6.4.2.1.3
            "elevacion_copa",     // 6.4.2.1.4
            "reduccion_copa",     // 6.4.2.1.5
            "bajo_cableado",      // 6.4.2.1.6
            "coniferas_maduras",  // 6.4.3
            "palmeras_maduras",   // 6.4.4
            "raices",             // 6.4.5
          ],
        },
        observaciones: { type: String, trim: true },
      },
      observaciones_generales: { type: String, trim: true },
    },

    // ── Técnico evaluador ──────────────────────────────────────────────────
    tecnico: {
      nombre:        { type: String, trim: true },
      acreditacion:  { type: String, trim: true },
      firma_s3_key:  { type: String },
    },

    // ── Evidencia multimedia ───────────────────────────────────────────────
    fotos:           [fotoSchema],
    transcripciones: [transcripcionSchema],
  },
  {
    timestamps: true,
  }
);

// ─── Índices ─────────────────────────────────────────────────────────────────

// Geoespacial: sparse=true para ignorar docs sin coordenadas (campo opcional en campo)
dictamenSchema.index({ "localizacion.coordenadas": "2dsphere" }, { sparse: true });

// Reportes por alcaldía y período
dictamenSchema.index({ tenant_id: 1, estado: 1, createdAt: -1 });

// Historial de un inspector
dictamenSchema.index({ inspector_id: 1, createdAt: -1 });

// Búsqueda por folio
dictamenSchema.index({ "folio.judiaps": 1 }, { sparse: true });

export const Dictamen = mongoose.model("Dictamen", dictamenSchema);
