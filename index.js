import { createServer } from "http";
import express from "express";
import { Server as SocketIO } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import connectDB from './config/db.js';
import morgan from "morgan";
import jwt from "jsonwebtoken";

import { errorHandler } from "./middlewares/errorHandler.js";
import { iniciarChangeStream } from "./services/changestream.service.js";

// Endpoints
import galaxyRoutes    from "./routes/galaxy.routes.js";
import userRoutes      from "./routes/users.routes.js";
import chatRoutes      from "./routes/chat.routes.js";
import dictamenRoutes  from "./routes/dictamen.routes.js";
import syncRoutes      from "./routes/sync.routes.js";
import reporteRoutes   from "./routes/reporte.routes.js";

const app    = express();
const server = createServer(app);
const PORT   = process.env.PORT || 1331;

// Socket.io — autenticación con JWT, rooms por tenant
const io = new SocketIO(server, {
  cors: { origin: "*" },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("AUTH_REQUIRED"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || process.env.SECRETORPRIVATEKEY);
    socket.usuario = payload;
    next();
  } catch {
    next(new Error("AUTH_INVALID"));
  }
});

io.on("connection", (socket) => {
  const { tenant_id } = socket.usuario;
  socket.join(`tenant:${tenant_id}`);
  socket.on("disconnect", () => {});
});

// DB + Change Stream
connectDB().then(() => iniciarChangeStream(io));

// Middlewares
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/galaxy", galaxyRoutes);
app.use("/api/galaxy", chatRoutes);
app.use("/api/galaxy/dictamenes", dictamenRoutes);
app.use("/api/galaxy", syncRoutes);
app.use("/api/galaxy/reportes", reporteRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Servidor Galaxy-Back corriendo en http://localhost:${PORT}`);
});
