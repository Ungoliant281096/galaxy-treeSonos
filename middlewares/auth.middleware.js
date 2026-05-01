import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
  const token = req.header("x-auth-token");

  // validar token
  if (!token) {
    return res.status(401).json({ msg: "No hay token, permiso no valido" });
  }

  // validar token
  try {
    const cifrado = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = cifrado;

    next();
  } catch (error) {
    res.status(401).json({ msg: "Token no valido" });
  }
};
