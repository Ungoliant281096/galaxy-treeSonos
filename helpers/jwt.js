import jwt from "jsonwebtoken";

export const generateJWT = (uid, tenant_id, role) => {
  return new Promise((resolve, reject) => {
    const payload = { uid, tenant_id, role };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
      (err, token) => {
        if (err) {
          console.log(err);
          reject("No se pudo generar el token");
        } else {
          resolve(token);
        }
      },
    );
  });
};

