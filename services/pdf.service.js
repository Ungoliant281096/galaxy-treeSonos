/**
 * pdf.service.js
 * Genera el Dictamen Técnico Arbóreo (NADF-001-RNAT-2015) en formato PDF
 * usando pdf-lib con primitivas vectoriales (sin Unicode especial).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Dictamen } from "../models/Dictamen.model.js";

// ─── Dimensiones y márgenes (Letter 8.5×11 in) ───────────────────────────────
const PW = 612;   // page width  (points)
const PH = 792;   // page height (points)
const ML = 36;    // margin left
const MR = 36;    // margin right
const MT = 36;    // margin top
const MB = 40;    // margin bottom
const CW = PW - ML - MR; // content width = 540

// ─── Tamaños de fuente ────────────────────────────────────────────────────────
const FS_HEADER  = 9;
const FS_SECTION = 8;
const FS_LABEL   = 6.5;
const FS_VALUE   = 7;
const FS_FOOT    = 5.5;

// ─── Colores ─────────────────────────────────────────────────────────────────
const C_BLACK  = rgb(0,    0,    0   );
const C_WHITE  = rgb(1,    1,    1   );
const C_DGRAY  = rgb(0.3,  0.3,  0.3 );
const C_GRAY   = rgb(0.6,  0.6,  0.6 );
const C_LGRAY  = rgb(0.88, 0.88, 0.88);
const C_GREEN  = rgb(0.12, 0.55, 0.24);
const C_RED    = rgb(0.85, 0.19, 0.15);
const C_HEADER = rgb(0.08, 0.30, 0.08);

// ─── Clase renderizadora (evita estado global / race conditions) ──────────────
class DictamenRenderer {
  constructor(doc, font, fontBold) {
    this.doc      = doc;
    this.font     = font;
    this.bold     = fontBold;
    this.pages    = [];
    this.curY     = 0;
    this._newPage();
  }

  // ── Gestión de páginas ─────────────────────────────────────────────────────
  _newPage() {
    const p = this.doc.addPage([PW, PH]);
    this.pages.push(p);
    this.curY = PH - MT;
  }

  get page() { return this.pages[this.pages.length - 1]; }

  ensure(needed = 18) {
    if (this.curY - needed < MB) this._newPage();
  }

  nl(d = 10) { this.curY -= d; }

  // ── Símbolos vectoriales ───────────────────────────────────────────────────
  // Dibuja cuadro 8×8 pt con símbolo adentro.
  // tipo: 'check' | 'cross' | 'dash' | 'empty'
  drawSymbol(x, y, tipo) {
    const S = 8;
    this.page.drawRectangle({
      x, y, width: S, height: S,
      borderColor: C_GRAY, borderWidth: 0.5,
      color: C_WHITE,
    });
    if (tipo === "check") {
      this.page.drawLine({ start: { x: x+1.5, y: y+3.8 }, end: { x: x+3.2, y: y+1.8 }, thickness: 1.3, color: C_GREEN });
      this.page.drawLine({ start: { x: x+3.2, y: y+1.8 }, end: { x: x+6.5, y: y+6.2 }, thickness: 1.3, color: C_GREEN });
    } else if (tipo === "cross") {
      this.page.drawLine({ start: { x: x+1.5, y: y+1.5 }, end: { x: x+6.5, y: y+6.5 }, thickness: 1.3, color: C_RED });
      this.page.drawLine({ start: { x: x+6.5, y: y+1.5 }, end: { x: x+1.5, y: y+6.5 }, thickness: 1.3, color: C_RED });
    } else if (tipo === "dash") {
      this.page.drawLine({ start: { x: x+1.8, y: y+4 }, end: { x: x+6.2, y: y+4 }, thickness: 1.0, color: C_GRAY });
    }
  }

  // Dibuja un checkbox con etiqueta. Retorna el ancho total consumido.
  drawOption(x, y, label, checked) {
    const sym = checked ? "check" : "dash";
    this.drawSymbol(x, y - 1, sym);
    const col = checked ? C_BLACK : C_DGRAY;
    this.page.drawText(label, { x: x + 10, y, font: this.font, size: FS_VALUE, color: col });
    return 10 + this.font.widthOfTextAtSize(label, FS_VALUE) + 5;
  }

  // Dibuja checkboxes en línea, con salto automático si se acaba el ancho.
  drawOptionsRow(y, opts, checkedValues, indentX = 0) {
    let cx = ML + indentX;
    for (const [val, lbl] of opts) {
      const isArr  = Array.isArray(checkedValues);
      const checked = isArr ? checkedValues.includes(val) : checkedValues === val;
      const w = this.drawOption(cx, y, lbl, checked);
      cx += w;
      if (cx > ML + CW - 50) { this.nl(11); cx = ML + indentX; this.ensure(12); }
    }
  }

  // ── Reglas y cabeceras ─────────────────────────────────────────────────────
  hRule(xOff = 0, w = CW, t = 0.35) {
    this.page.drawLine({
      start: { x: ML + xOff, y: this.curY },
      end:   { x: ML + xOff + w, y: this.curY },
      thickness: t, color: C_LGRAY,
    });
  }

  sectionHeader(num, title) {
    this.ensure(26);
    this.nl(5);
    this.page.drawRectangle({
      x: ML, y: this.curY - 13, width: CW, height: 15,
      color: C_LGRAY,
    });
    this.page.drawText(`${num}. ${title.toUpperCase()}`, {
      x: ML + 4, y: this.curY - 10,
      font: this.bold, size: FS_SECTION, color: C_BLACK,
    });
    this.nl(18);
  }

  subHeader(text, indent = 0) {
    this.ensure(14);
    this.page.drawText(text.toUpperCase(), {
      x: ML + indent, y: this.curY,
      font: this.bold, size: FS_LABEL + 0.5, color: C_DGRAY,
    });
    this.nl(10);
  }

  // ── Campos de texto ────────────────────────────────────────────────────────
  // Un campo con etiqueta y subrayado, inline. Retorna ancho usado.
  fieldInline(x, y, label, value, fieldWidth) {
    const lw = this.bold.widthOfTextAtSize(label, FS_LABEL);
    this.page.drawText(label, { x, y, font: this.bold, size: FS_LABEL, color: C_DGRAY });
    const val = (value !== null && value !== undefined && value !== "") ? String(value) : "—";
    this.page.drawText(val, { x: x + lw + 1, y, font: this.font, size: FS_VALUE, color: C_BLACK });
    this.page.drawLine({
      start: { x, y: y - 2 },
      end:   { x: x + fieldWidth, y: y - 2 },
      thickness: 0.3, color: C_GRAY,
    });
    return fieldWidth + 3;
  }

  // Fila de campos (array de {label, value, width})
  fieldRow(fields) {
    this.ensure(14);
    let x = ML;
    for (const f of fields) {
      this.fieldInline(x, this.curY, f.label, f.value, f.width);
      x += f.width + 4;
    }
    this.nl(12);
  }

  // Campo con wrap de texto (para textos largos)
  fieldBlock(label, value) {
    this.ensure(22);
    this.page.drawText(label, { x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY });
    this.nl(10);
    const lines = this._wrapText(value, CW - 4);
    for (const line of lines) {
      this.ensure(11);
      this.page.drawText(line, { x: ML + 4, y: this.curY, font: this.font, size: FS_VALUE, color: C_BLACK });
      this.nl(10);
    }
    this.page.drawLine({
      start: { x: ML, y: this.curY + 2 },
      end:   { x: ML + CW, y: this.curY + 2 },
      thickness: 0.3, color: C_GRAY,
    });
    this.nl(4);
  }

  // Booleano: etiqueta + símbolo check/cross/dash
  boolField(x, y, label, value) {
    const lw = this.bold.widthOfTextAtSize(label, FS_LABEL) + 3;
    this.page.drawText(label, { x, y, font: this.bold, size: FS_LABEL, color: C_DGRAY });
    const sym = value === true ? "check" : value === false ? "cross" : "dash";
    this.drawSymbol(x + lw, y - 1, sym);
    return lw + 12;
  }

  _wrapText(text, maxW) {
    if (!text) return ["—"];
    const words = String(text).split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? cur + " " + w : w;
      if (this.font.widthOfTextAtSize(test, FS_VALUE) > maxW) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : ["—"];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECCIONES
  // ─────────────────────────────────────────────────────────────────────────

  renderHeader(d) {
    // Bloque de cabecera verde
    this.page.drawRectangle({
      x: ML, y: this.curY - 32, width: CW, height: 36,
      color: C_HEADER,
    });
    this.page.drawText("SECRETARÍA DEL MEDIO AMBIENTE – CDMX", {
      x: ML + 5, y: this.curY - 11,
      font: this.bold, size: 7.5, color: C_WHITE,
    });
    this.page.drawText("DICTAMEN TÉCNICO ARBÓREO", {
      x: ML + 5, y: this.curY - 22,
      font: this.bold, size: FS_HEADER + 1, color: C_WHITE,
    });
    // Badge de estado (derecha)
    const estado = (d.estado ?? "borrador").toUpperCase();
    const bw = this.bold.widthOfTextAtSize(estado, 7) + 10;
    this.page.drawRectangle({
      x: ML + CW - bw - 2, y: this.curY - 26,
      width: bw, height: 14,
      color: rgb(1, 1, 1), opacity: 0.18,
    });
    this.page.drawText(estado, {
      x: ML + CW - bw + 3, y: this.curY - 22,
      font: this.bold, size: 7, color: C_WHITE,
    });
    this.nl(36);
    // Línea de norma e ID
    const norma   = d.norma_aplicada?.clave ?? "NADF-001-RNAT-2015";
    const version = d.norma_aplicada?.version_formulario ?? "v1.0";
    this.page.drawText(
      `Norma: ${norma}  ·  Versión: ${version}  ·  ID: ${d._id}`,
      { x: ML, y: this.curY, font: this.font, size: 5.5, color: C_DGRAY }
    );
    this.nl(9);
    this.hRule();
    this.nl(3);
  }

  renderFolioFecha(d) {
    this.sectionHeader("REF", "Referencias y Fecha de Evaluación");

    // Folios en fila
    const folios = [
      ["JUDIAPS", d.folio?.judiaps], ["DEGU", d.folio?.degu],
      ["DGSU",    d.folio?.dgsu],    ["COY",  d.folio?.coy],
      ["SAC",     d.folio?.sac],     ["SUAC", d.folio?.suac],
    ];
    const cw6 = Math.floor(CW / 6);
    this.ensure(14);
    let fx = ML;
    for (const [lbl, val] of folios) {
      this.fieldInline(fx, this.curY, lbl + ": ", val, cw6 - 4);
      fx += cw6;
    }
    this.nl(12);

    // Fecha y hora
    const fe = d.fecha_evaluacion ?? {};
    const dia  = fe.dia  ? String(fe.dia).padStart(2, "0")  : null;
    const mes  = fe.mes  ? String(fe.mes).padStart(2, "0")  : null;
    const anio = fe.anio ? String(fe.anio) : null;
    const hora = fe.hora ?? null;
    this.fieldRow([
      { label: "Día: ",  value: dia,  width: 55 },
      { label: "Mes: ",  value: mes,  width: 55 },
      { label: "Año: ",  value: anio, width: 70 },
      { label: "Hora: ", value: hora, width: CW - 210 },
    ]);
  }

  renderSolicitante(d) {
    this.sectionHeader("1", "Datos del Solicitante");
    const s   = d.solicitante ?? {};
    const dom = s.domicilio ?? {};

    this.fieldRow([
      { label: "Calle y Núm.: ", value: dom.calle_num, width: 210 },
      { label: "Colonia: ",      value: dom.colonia,   width: 155 },
      { label: "Alcaldía: ",     value: dom.alcaldia,  width: 120 },
    ]);
    this.fieldRow([
      { label: "C.P.: ",                 value: dom.cp,                 width: 70 },
      { label: "Actividad solicitada: ", value: s.actividad_solicitada, width: CW - 80 },
    ]);
    this.fieldBlock("Justificación:", s.justificacion);
  }

  renderLocalizacion(d) {
    this.sectionHeader("2", "Localización del Árbol");
    const loc = d.localizacion ?? {};

    // Tipo de ubicación
    this.ensure(14);
    this.page.drawText("Tipo de ubicación:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    this.nl(11);

    this.drawOptionsRow(this.curY, [
      ["banqueta",          "Banqueta"],
      ["camellón",          "Camellón"],
      ["glorieta",          "Glorieta"],
      ["parque",            "Parque"],
      ["arriate",           "Arriate"],
      ["plaza",             "Plaza"],
      ["propiedad_privada", "Propiedad Privada"],
      ["obra_civil",        "Obra Civil"],
      ["otro",              "Otro"],
    ], loc.tipo, 0);
    this.nl(13);

    // Otro
    if (loc.tipo === "otro" && loc.tipo_otro) {
      this.fieldRow([{ label: "Especificar: ", value: loc.tipo_otro, width: 200 }]);
    }

    this.fieldRow([
      { label: "Calle y Núm.: ", value: loc.calle_num,   width: 210 },
      { label: "Colonia: ",      value: loc.colonia,      width: 155 },
      { label: "Alcaldía: ",     value: loc.alcaldia,     width: 120 },
    ]);
    this.fieldRow([
      { label: "Entre: ", value: loc.entre_calle, width: 240 },
      { label: "Y: ",     value: loc.y_calle,     width: CW - 252 },
    ]);
    if (loc.coordenadas?.coordinates?.length === 2) {
      const [lng, lat] = loc.coordenadas.coordinates;
      this.fieldRow([
        { label: "Latitud: ",  value: lat.toFixed(6), width: 160 },
        { label: "Longitud: ", value: lng.toFixed(6), width: 160 },
      ]);
    }
    if (loc.observaciones) this.fieldBlock("Observaciones:", loc.observaciones);
  }

  renderCaracteristicas(d) {
    this.sectionHeader("3", "Características del Árbol");
    const c  = d.caracteristicas ?? {};
    const ci = c.nombre_cientifico ?? {};

    this.fieldRow([
      { label: "Nombre común: ", value: c.nombre_comun, width: 190 },
      { label: "Género: ",       value: ci.genero,      width: 150 },
      { label: "Especie: ",      value: ci.especie,     width: 150 },
    ]);
    this.fieldRow([
      { label: "Variedad: ", value: ci.variedad, width: 150 },
    ]);

    // Tipo de hoja
    this.ensure(14);
    this.page.drawText("Tipo de hoja:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    let cx = ML + this.bold.widthOfTextAtSize("Tipo de hoja:", FS_LABEL) + 6;
    cx += this.drawOption(cx, this.curY, "Caducifolio",  c.tipo_hoja === "caducifolio");
    this.drawOption(cx, this.curY, "Perennifolio", c.tipo_hoja === "perennifolio");
    this.nl(12);

    this.fieldRow([
      { label: "Altura total (m): ",      value: c.altura_total_m,             width: 120 },
      { label: "DAP (cm, a 1.30 m): ",    value: c.diametro_tronco_130cm,      width: 140 },
      { label: "Copa promedio (m): ",      value: c.ancho_copa_promedio_m,      width: 120 },
      { label: "Copa largo (m): ",         value: c.largo_copa_m,               width: CW - 410 },
    ]);
    this.fieldRow([
      { label: "Dist. suelo a follaje (m): ", value: c.distancia_suelo_follaje_m, width: 200 },
    ]);
  }

  renderInterferencias(d) {
    this.sectionHeader("4", "Interferencias");
    const itr = d.interferencias ?? {};

    const rows = [
      {
        label: "Follaje:", vals: itr.follaje ?? [],
        opts: [
          ["inmueble",           "Inmueble"],
          ["mobiliario",         "Mobiliario"],
          ["transito_vehicular", "Tránsito vehicular"],
          ["camaras_seguridad",  "Cámaras de seguridad"],
        ],
      },
      {
        label: "Tronco:", vals: itr.tronco ?? [],
        opts: [
          ["cables_electricos", "Cables eléctricos"],
          ["luminarias",        "Luminarias"],
          ["peatonal",          "Peatonal"],
          ["otros",             "Otros"],
        ],
      },
      {
        label: "Raíces:", vals: itr.raices ?? [],
        opts: [
          ["registros",        "Registros"],
          ["senales_transito", "Señales de tránsito"],
        ],
      },
    ];

    for (const row of rows) {
      this.ensure(14);
      const lw = this.bold.widthOfTextAtSize(row.label, FS_LABEL);
      this.page.drawText(row.label, {
        x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
      });
      let cx = ML + lw + 4;
      for (const [val, lbl] of row.opts) {
        cx += this.drawOption(cx, this.curY, lbl, row.vals.includes(val));
      }
      this.nl(12);
    }

    if (itr.observaciones) this.fieldBlock("Observaciones:", itr.observaciones);
  }

  renderDescripcionSitio(d) {
    this.sectionHeader("5", "Descripción del Sitio");
    const ds = d.descripcion_sitio ?? {};

    this.ensure(14);
    this.page.drawText("Rodeado de:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    this.nl(11);
    this.drawOptionsRow(this.curY, [
      ["transito_vehicular", "Tránsito vehicular"],
      ["pasto",              "Pasto"],
      ["arboles_plantas",    "Árboles/plantas"],
      ["pavimento",          "Pavimento"],
      ["registro",           "Registro"],
      ["residuos_solidos",   "Residuos sólidos"],
    ], ds.rodeado ?? [], 0);
    this.nl(13);

    // Riego + compactación en misma línea
    this.ensure(14);
    this.boolField(ML, this.curY, "Riego:  ", ds.riego);
    const cpx = ML + 80;
    this.page.drawText("Compactación del suelo:", {
      x: cpx, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    let ccx = cpx + this.bold.widthOfTextAtSize("Compactación del suelo:", FS_LABEL) + 5;
    for (const [v, l] of [["ligero","Ligero"],["moderado","Moderado"],["severo","Severo"]]) {
      ccx += this.drawOption(ccx, this.curY, l, ds.compactacion_suelo === v);
    }
    this.nl(13);
  }

  renderFitosanitario(d) {
    this.sectionHeader("6", "Estado Fitosanitario");
    const ef = d.estado_fitosanitario ?? {};

    const subsecs = [
      {
        label: "Hojas",
        data:  ef.hojas,
        bio:  [["enfermedades","Enfermedades"],["plagas","Plagas"]],
        abio: [["marchitez","Marchitez"],["granizo","Granizo"],["helada","Helada"],["clorosis","Clorosis"]],
      },
      {
        label: "Ramas",
        data:  ef.ramas,
        bio:  [["enfermedades","Enfermedades"],["plagas","Plagas"],["muerdago","Muérdago"]],
        abio: [["muertas","Muertas"],["caidas","Caídas"],["desprendidas","Desprendidas"],
               ["desmoche","Desmoche"],["heridas","Heridas"],["vandalismo","Vandalismo"]],
      },
      {
        label: "Tronco",
        data:  ef.tronco,
        bio:  [["enfermedades","Enfermedades"],["plagas","Plagas"]],
        abio: [["vandalismo","Vandalismo"],["estrangulamiento","Estrangulamiento"],
               ["cavidades","Cavidades"],["pudricion","Pudrición"],["heridas","Heridas"]],
      },
      {
        label: "Raíces",
        data:  ef.raices,
        bio:  [["enfermedades","Enfermedades"],["plagas","Plagas"]],
        abio: [["expuestas","Expuestas/superf."],["cortadas","Cortadas"],
               ["reprimidas","Reprimidas/pav."],["estranguladas","Estranguladas"],["heridas","Heridas"]],
      },
    ];

    for (const sec of subsecs) {
      const sd = sec.data ?? {};
      this.subHeader(sec.label, 2);

      // Biótico
      this.ensure(13);
      const lbBio = this.bold.widthOfTextAtSize("Biótico:", FS_LABEL);
      this.page.drawText("Biótico:", { x: ML + 8, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY });
      let cx = ML + 8 + lbBio + 4;
      for (const [v, l] of sec.bio) {
        cx += this.drawOption(cx, this.curY, l, (sd.biotico ?? []).includes(v));
      }
      this.nl(11);

      // Abiótico
      this.ensure(13);
      const lbAbio = this.bold.widthOfTextAtSize("Abiótico:", FS_LABEL);
      this.page.drawText("Abiótico:", { x: ML + 8, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY });
      cx = ML + 8 + lbAbio + 4;
      for (const [v, l] of sec.abio) {
        cx += this.drawOption(cx, this.curY, l, (sd.abiotico ?? []).includes(v));
        if (cx > ML + CW - 60) { this.nl(11); cx = ML + 8 + lbAbio + 4; this.ensure(12); }
      }
      this.nl(11);

      if (sd.observaciones) {
        this.ensure(11);
        this.page.drawText("Obs.: " + sd.observaciones, {
          x: ML + 8, y: this.curY, font: this.font, size: FS_LABEL, color: C_DGRAY,
        });
        this.nl(10);
      }
    }
  }

  renderEstructura(d) {
    this.sectionHeader("7", "Estructura del Árbol");
    const est = d.estructura ?? {};

    // Condición
    this.ensure(14);
    this.page.drawText("Condición estructural:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    let cx = ML + this.bold.widthOfTextAtSize("Condición estructural:", FS_LABEL) + 5;
    for (const [v, l] of [
      ["irrecuperable",    "Irrecuperable"],
      ["susceptible_mejora","Susceptible de mejora"],
      ["buena",            "Buena"],
      ["muy_buena",        "Muy buena"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, est.condicion === v);
      if (cx > ML + CW - 60) { this.nl(11); cx = ML + 20; this.ensure(12); }
    }
    this.nl(12);

    this.fieldRow([
      { label: "Inclinación del tronco (°): ", value: est.tronco_inclinacion_grados, width: 200 },
    ]);

    // Problemas estructurales
    this.ensure(14);
    this.page.drawText("Problemas estructurales:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    this.nl(11);
    cx = ML + 4;
    for (const [v, l] of [
      ["copa_mal_equilibrada",    "Copa mal equilibrada"],
      ["apice_terminal_multiple", "Ápice terminal múltiple"],
      ["ramas_largas",            "Ramas muy largas"],
      ["troncos_multiples",       "Troncos múltiples"],
      ["corteza_incluida",        "Corteza incluida"],
      ["troncos_codominantes",    "Troncos codominantes"],
      ["chupones",                "Chupones"],
      ["ramas_codominantes",      "Ramas codominantes"],
      ["cola_de_leon",            "Cola de León"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, (est.problemas ?? []).includes(v));
      if (cx > ML + CW - 80) { this.nl(11); cx = ML + 4; this.ensure(12); }
    }
    this.nl(13);
  }

  renderValoracion(d) {
    this.sectionHeader("8", "Valoración");
    const val = d.valoracion ?? {};

    // Condición general
    this.ensure(14);
    this.page.drawText("Condición general:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    let cx = ML + this.bold.widthOfTextAtSize("Condición general:", FS_LABEL) + 5;
    for (const [v, l] of [
      ["muy_bueno",            "Muy bueno"],
      ["bueno",                "Bueno"],
      ["declinante_incipiente","Declinante incipiente"],
      ["declinante_severo",    "Declinante severo"],
      ["muerto",               "Muerto"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, val.condicion_general === v);
      if (cx > ML + CW - 50) { this.nl(11); cx = ML + 20; this.ensure(12); }
    }
    this.nl(12);

    // Expectativa de vida
    this.ensure(14);
    this.page.drawText("Expectativa de vida:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    cx = ML + this.bold.widthOfTextAtSize("Expectativa de vida:", FS_LABEL) + 5;
    for (const [v, l] of [
      ["5_anios", "<= 5 anios"],
      ["6_a_20",  "6-20 anios"],
      ["21_a_40", "21-40 anios"],
      ["mas_40",  "> 40 anios"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, val.expectativa_vida === v);
    }
    this.nl(12);

    // Presencia de árboles en 100 m
    this.ensure(14);
    this.page.drawText("Árboles en 100 m a la redonda:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    cx = ML + this.bold.widthOfTextAtSize("Árboles en 100 m a la redonda:", FS_LABEL) + 5;
    for (const [v, l] of [
      ["mas_300",   "> 300"],
      ["200_a_300", "200-300"],
      ["51_a_199",  "51-199"],
      ["50_o_menos","50 o menos"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, val.presencia_arboles_100m === v);
    }
    this.nl(12);

    // Otros valores
    this.ensure(14);
    this.page.drawText("Otros valores del árbol:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    cx = ML + this.bold.widthOfTextAtSize("Otros valores del árbol:", FS_LABEL) + 5;
    for (const [v, l] of [
      ["cientifico",     "Científico"],
      ["historico",      "Histórico"],
      ["social_cultural","Social/cultural"],
      ["otros",          "Otros"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, (val.otros_valores ?? []).includes(v));
    }
    this.nl(13);
  }

  renderManejo(d) {
    this.sectionHeader("9", "Manejo y Conclusiones");
    const man = d.manejo ?? {};

    // Alternativas al derribo
    this.ensure(14);
    this.page.drawText("Alternativas al derribo:", {
      x: ML, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
    });
    this.nl(11);
    let cx = ML + 4;
    for (const [v, l] of [
      ["trasplante",              "Trasplante"],
      ["adecuacion_constructiva", "Adecuación del diseño constructivo"],
      ["calendarizacion_podas",   "Programación y calendarización de podas"],
    ]) {
      cx += this.drawOption(cx, this.curY, l, (man.alternativas_derribo ?? []).includes(v));
      if (cx > ML + CW - 60) { this.nl(11); cx = ML + 4; this.ensure(12); }
    }
    this.nl(13);

    // Derribo
    this.ensure(14);
    this.boolField(ML, this.curY, "Derribo aplica: ", man.derribo?.aplica);
    this.nl(12);

    if (man.derribo?.aplica) {
      this.ensure(14);
      this.page.drawText("Causales:", {
        x: ML + 8, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
      });
      this.nl(11);
      cx = ML + 12;
      for (const [v, l] of [
        ["riesgo_personas_bienes",      "Riesgo a personas/bienes"],
        ["afectacion_infraestructura",  "Afectación a infraestructura"],
        ["riesgo_patrimonio",           "Riesgo al patrimonio"],
        ["mejoramiento_area_verde",     "Mejoramiento área verde"],
        ["saneamiento_arboles_aledanos","Saneamiento árboles aledaños"],
        ["obra_publica_privada",        "Obra pública o privada"],
      ]) {
        cx += this.drawOption(cx, this.curY, l, (man.derribo?.causales ?? []).includes(v));
        if (cx > ML + CW - 60) { this.nl(11); cx = ML + 12; this.ensure(12); }
      }
      this.nl(12);
      if (man.derribo?.observaciones) this.fieldBlock("Obs. derribo:", man.derribo.observaciones);
    }

    // Podas
    this.ensure(14);
    this.boolField(ML, this.curY, "Podas aplica: ", man.podas?.aplica);
    this.nl(12);

    if (man.podas?.aplica) {
      this.ensure(14);
      this.page.drawText("Tipos de poda:", {
        x: ML + 8, y: this.curY, font: this.bold, size: FS_LABEL, color: C_DGRAY,
      });
      this.nl(11);
      cx = ML + 12;
      for (const [v, l] of [
        ["limpieza",          "Limpieza (6.4.2.1.1)"],
        ["restauracion_copa", "Restauración copa (6.4.2.1.2)"],
        ["aclareo_copa",      "Aclareo copa (6.4.2.1.3)"],
        ["elevacion_copa",    "Elevación copa (6.4.2.1.4)"],
        ["reduccion_copa",    "Reducción copa (6.4.2.1.5)"],
        ["bajo_cableado",     "Bajo cableado (6.4.2.1.6)"],
        ["coniferas_maduras", "Coníferas maduras (6.4.3)"],
        ["palmeras_maduras",  "Palmeras maduras (6.4.4)"],
        ["raices",            "Poda de raíces (6.4.5)"],
      ]) {
        cx += this.drawOption(cx, this.curY, l, (man.podas?.tipos ?? []).includes(v));
        if (cx > ML + CW - 60) { this.nl(11); cx = ML + 12; this.ensure(12); }
      }
      this.nl(12);
      if (man.podas?.observaciones) this.fieldBlock("Obs. podas:", man.podas.observaciones);
    }

    if (man.observaciones_generales) {
      this.fieldBlock("Observaciones generales:", man.observaciones_generales);
    }
  }

  renderFirma(d) {
    this.sectionHeader("FIRMA", "Técnico Evaluador");
    const tec = d.tecnico ?? {};

    this.fieldRow([
      { label: "Nombre: ",       value: tec.nombre,       width: 270 },
      { label: "Acreditación: ", value: tec.acreditacion, width: CW - 280 },
    ]);

    // Cuadro de firma
    this.ensure(55);
    this.page.drawRectangle({
      x: ML, y: this.curY - 42,
      width: 180, height: 44,
      borderColor: C_GRAY, borderWidth: 0.5, color: C_WHITE,
    });
    this.page.drawText("Firma del Técnico Evaluador", {
      x: ML + 25, y: this.curY - 28, font: this.font, size: FS_LABEL, color: C_GRAY,
    });
    this.nl(50);

    // Pie de página
    this.ensure(14);
    this.hRule();
    this.nl(4);
    const ts = new Date().toISOString().replace("T", "  ").substring(0, 22);
    this.page.drawText(
      `Generado: ${ts}  ·  Inspector ID: ${d.inspector_id}  ·  Tenant: ${d.tenant_id}  ·  ${d.norma_aplicada?.clave ?? "NADF-001-RNAT-2015"}`,
      { x: ML, y: this.curY, font: this.font, size: FS_FOOT, color: C_GRAY }
    );
  }

  // ─── Orquestador ──────────────────────────────────────────────────────────
  render(d) {
    this.renderHeader(d);
    this.nl(4);
    this.renderFolioFecha(d);
    this.renderSolicitante(d);
    this.renderLocalizacion(d);
    this.renderCaracteristicas(d);
    this.renderInterferencias(d);
    this.renderDescripcionSitio(d);
    this.renderFitosanitario(d);
    this.renderEstructura(d);
    this.renderValoracion(d);
    this.renderManejo(d);
    this.renderFirma(d);
  }
}

// ─── Export principal ─────────────────────────────────────────────────────────
export const generarDictamenPdf = async ({ id }) => {
  const dictamen = await Dictamen.findById(id).lean();
  if (!dictamen) throw new Error("DICTAMEN_NOT_FOUND");

  const doc      = await PDFDocument.create();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const renderer = new DictamenRenderer(doc, font, fontBold);
  renderer.render(dictamen);

  return doc.save(); // Uint8Array — el controlador envía como application/pdf
};
