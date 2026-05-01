import Redis from "ioredis";
import { config } from "../config/config.js";

const redis = new Redis(config.redis.url, { lazyConnect: true });

redis.on("error", (err) => console.error("[Redis]", err.message));

const key = (dictamen_id) => `chat:session:${dictamen_id}`;

export const getSession = async (dictamen_id) => {
  const raw = await redis.get(key(dictamen_id));
  return raw ? JSON.parse(raw) : null;
};

export const saveSession = async (dictamen_id, session) => {
  await redis.set(key(dictamen_id), JSON.stringify(session), "EX", config.sessionTTL);
};

export const deleteSession = async (dictamen_id) => {
  await redis.del(key(dictamen_id));
};

/**
 * Estructura de una sesión:
 * {
 *   dictamen_id,
 *   tenant_id,
 *   inspector_id,
 *   campos_completados: ["altura_total", "nombre_comun", ...],
 *   historial: [{ role: "assistant"|"user", content: "..." }, ...],
 *   createdAt
 * }
 */
export const crearSession = async (dictamen_id, { tenant_id, inspector_id }) => {
  const session = {
    dictamen_id,
    tenant_id,
    inspector_id,
    campos_completados: [],
    historial: [],
    createdAt: new Date().toISOString(),
  };
  await saveSession(dictamen_id, session);
  return session;
};
