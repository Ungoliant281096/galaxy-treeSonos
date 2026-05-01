import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  reportePorAlcaldia,
  reportePorDia,
  reporteTopInspectores,
} from "../services/reporte.service.js";

const router = Router();

// Solo supervisor y admin pueden consultar reportes
function soloSupervisor(req, res, next) {
  if (!["supervisor", "admin"].includes(req.usuario.role)) {
    return res.status(403).json({ msg: "Acceso restringido a supervisores" });
  }
  next();
}

router.get("/alcaldia", authMiddleware, soloSupervisor, async (req, res) => {
  const { desde, hasta } = req.query;
  const data = await reportePorAlcaldia(req.usuario.tenant_id, desde, hasta);
  return res.json(data);
});

router.get("/por-dia", authMiddleware, soloSupervisor, async (req, res) => {
  const dias = parseInt(req.query.dias) || 30;
  const data = await reportePorDia(req.usuario.tenant_id, dias);
  return res.json(data);
});

router.get("/inspectores", authMiddleware, soloSupervisor, async (req, res) => {
  const { desde, hasta } = req.query;
  const top = parseInt(req.query.top) || 10;
  const data = await reporteTopInspectores(req.usuario.tenant_id, desde, hasta, top);
  return res.json(data);
});

export default router;
