import express from "express";
import helmet from "helmet";
import cors from "cors";
import connectDB from './config/db.js';
import morgan from "morgan";
import bodyParser from "body-parser";

import { errorHandler } from "./middlewares/errorHandler.js";

// Endpoints
import galaxyRoutes from "./routes/galaxy.routes.js";
import userRoutes from "./routes/users.routes.js";

// Configuraciones
const app = express();
const PORT = process.env.PORT || 1331;

const jsonParser = bodyParser.json();
const urlencodedParser = bodyParser.urlencoded({ extended: false });

// Conectar a la base de datos
connectDB();

// Middlewares
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Rutas
app.use("/api/galaxy", galaxyRoutes);
app.use("/api/users", userRoutes);

app.use(errorHandler);

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor Galaxy-Back corriendo en http://localhost:${PORT}`);
});