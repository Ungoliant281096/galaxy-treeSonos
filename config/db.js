import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const dbUri = process.env.MONGO_URI || "mongodb://localhost:27017/galaxy_db";

const connectDB = async () => {
  try {
    // Conectar a la base de datos
    const conn = await mongoose.connect(dbUri);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);

    process.exit(1);

    // Manejar la interrupción del proceso
    process.on("SIGINT", () => {
      mongoose.connection.close(() => {
        console.log("MongoDB connection closed");
        process.exit(0);
      });
    });
  }
};

// Manejar la desconexión de la base de datos
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// Manejar errores de la base de datos
mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

export default connectDB;
