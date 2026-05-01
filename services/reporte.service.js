import { Dictamen } from "../models/Dictamen.model.js";

/**
 * Agrega dictámenes por alcaldía para un rango de fechas.
 * DDIA Cap 10: derived data — calculado on-demand o via batch cron.
 */
export const reportePorAlcaldia = async (tenant_id, desde, hasta) => {
  const match = { tenant_id };
  if (desde || hasta) {
    match.createdAt = {};
    if (desde) match.createdAt.$gte = new Date(desde);
    if (hasta) match.createdAt.$lte = new Date(hasta);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id:          "$localizacion.alcaldia",
        total:        { $sum: 1 },
        aprobados:    { $sum: { $cond: [{ $eq: ["$estado", "aprobado"]    }, 1, 0] } },
        rechazados:   { $sum: { $cond: [{ $eq: ["$estado", "rechazado"]   }, 1, 0] } },
        en_progreso:  { $sum: { $cond: [{ $eq: ["$estado", "en_progreso"] }, 1, 0] } },
        completados:  { $sum: { $cond: [{ $eq: ["$estado", "completado"]  }, 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
  ];

  return Dictamen.aggregate(pipeline);
};

/**
 * Agrega dictámenes por día (últimos N días).
 */
export const reportePorDia = async (tenant_id, dias = 30) => {
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const pipeline = [
    { $match: { tenant_id, createdAt: { $gte: desde } } },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "America/Mexico_City" },
        },
        total:     { $sum: 1 },
        aprobados: { $sum: { $cond: [{ $eq: ["$estado", "aprobado"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  return Dictamen.aggregate(pipeline);
};

/**
 * Top inspectores por volumen en el período.
 */
export const reporteTopInspectores = async (tenant_id, desde, hasta, top = 10) => {
  const match = { tenant_id };
  if (desde || hasta) {
    match.createdAt = {};
    if (desde) match.createdAt.$gte = new Date(desde);
    if (hasta) match.createdAt.$lte = new Date(hasta);
  }

  const pipeline = [
    { $match: match },
    {
      $group: {
        _id:       "$inspector_id",
        total:     { $sum: 1 },
        aprobados: { $sum: { $cond: [{ $eq: ["$estado", "aprobado"] }, 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
    { $limit: top },
  ];

  return Dictamen.aggregate(pipeline);
};
