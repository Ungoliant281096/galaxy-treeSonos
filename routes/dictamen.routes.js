import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  crearDictamen,
  listarDictamenes,
  obtenerDictamen,
  cambiarEstado,
  eliminarDictamen,
  exportarPDF
} from "../controllers/dictamen.controller.js";

const router = Router();

router.post("/",         authMiddleware, crearDictamen);
router.get("/",          authMiddleware, listarDictamenes);
router.get("/:id",       authMiddleware, obtenerDictamen);
router.get("/:id/pdf",       authMiddleware, exportarPDF);
router.patch("/:id/estado", authMiddleware, cambiarEstado);
router.delete("/:id",    authMiddleware, eliminarDictamen);

export default router;
