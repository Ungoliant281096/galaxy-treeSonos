import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Almacenamiento temporal luego a s3
const storage = multer.memoryStorage();

// Filtro para archivos de audio
const fileFilte = (req, file, cb) => {
  const validMimetypes = /audio\/(mpeg|mp3|wav|wave|x-wav|m4a|x-m4a|mp4|flac|x-flac|aac|ogg)$/;
  const validExtensions = /\.(mp3|wav|m4a|flac|aac|ogg)$/i;

  const mimetype = validMimetypes.test(file.mimetype);
  const extname = validExtensions.test(path.extname(file.originalname));

  if (mimetype && extname) {
    return cb(null, true);
  }

  cb(new Error("Formato de archivo no soportado"));
};

export const uploadAudio = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilte
}).single("audio"); // Nombre del campo en el formulario debe llamarse audio