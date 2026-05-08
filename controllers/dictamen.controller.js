import { Dictamen } from "../models/Dictamen.model.js";
import { createDictamen, getDictamen } from "../services/dictamen.service.js";
import { filtrosDictamenDto, cambiarEstadoDto } from "../dtos/dictamen.dto.js";
import { generarDictamenPdf } from "../services/pdf.service.js";

export const crearDictamen = async (req, res) => {
  try {
    const { uid, tenant_id } = req.usuario;
    const dictamen = await Dictamen.create({
      inspector_id: uid,
      tenant_id,
      estado: 'borrador',
      norma_aplicada: { clave: 'NADF-001-RNAT-2015', version_formulario: 'v2.1' },
    });
    return res.status(201).json(dictamen);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

export const listarDictamenes = async (req, res) => {
  const parsed = filtrosDictamenDto.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const { estado, desde, hasta, inspector, page, limit } = parsed.data;
  const { tenant_id } = req.usuario;

  const filtro = { tenant_id };
  if (estado)    filtro.estado = estado;
  if (inspector) filtro.inspector_id = inspector;
  if (desde || hasta) {
    filtro.createdAt = {};
    if (desde) filtro.createdAt.$gte = new Date(desde);
    if (hasta) filtro.createdAt.$lte = new Date(hasta);
  }

  const [dictamenes, total] = await Promise.all([
    Dictamen.find(filtro)
      .select("estado norma_aplicada localizacion.alcaldia localizacion.calle_num inspector_id createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Dictamen.countDocuments(filtro),
  ]);

  return res.json({
    data:  dictamenes,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
};

export const obtenerDictamen = async (req, res) => {
  try {
    const dictamen = await getDictamen(req.params.id, req.usuario.tenant_id);
    return res.json(dictamen);
  } catch (error) {
    if (error.message === "DICTAMEN_NOT_FOUND") {
      return res.status(404).json({ msg: "Dictamen no encontrado" });
    }
    return res.status(500).json({ msg: error.message });
  }
};

export const cambiarEstado = async (req, res) => {
  const parsed = cambiarEstadoDto.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }

  const { estado, observacion } = parsed.data;
  const { uid, tenant_id } = req.usuario;

  try {
    const dictamen = await Dictamen.findOneAndUpdate(
      { _id: req.params.id, tenant_id },
      {
        $set:  { estado },
        $push: { historial_estados: { estado, usuario_id: uid, observacion } },
      },
      { new: true }
    );

    if (!dictamen) return res.status(404).json({ msg: "Dictamen no encontrado" });
    return res.json({ estado: dictamen.estado, historial: dictamen.historial_estados });
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
};

export const eliminarDictamen = async (req, res) => {
  const { tenant_id, role } = req.usuario;

  if (role !== "admin") {
    return res.status(403).json({ msg: "Solo administradores pueden eliminar dictámenes" });
  }

  const dictamen = await Dictamen.findOneAndDelete({ _id: req.params.id, tenant_id });
  if (!dictamen) return res.status(404).json({ msg: "Dictamen no encontrado" });

  return res.json({ msg: "Dictamen eliminado" });
};

export const exportarPDF = async (req, res) => {
  try {
    const pdfBytes = await generarDictamenPdf({
      id: req.params.id,
      tenant_id: req.usuario.tenant_id,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dictamen-${req.params.id}.pdf"`
    );
    return res.end(Buffer.from(pdfBytes));
  } catch (error) {
    if (error.message === "DICTAMEN_NOT_FOUND") {
      return res.status(404).json({ msg: "Dictamen no encontrado" });
    }
    return res.status(500).json({ msg: error.message });
  }
};
