import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listarDictamenes,
  obtenerDictamen,
  cambiarEstado,
  eliminarDictamen,
} from "../controllers/dictamen.controller.js";

const router = Router();

router.get("/",          authMiddleware, listarDictamenes);
router.get("/:id",       authMiddleware, obtenerDictamen);
router.patch("/:id/estado", authMiddleware, cambiarEstado);
router.delete("/:id",    authMiddleware, eliminarDictamen);

export default router;
