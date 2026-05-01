import mongoose from "mongoose";
import bcrypt from "bcrypt";

const usuarioSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es obligatorio"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "El correo es obligatorio"],
      unique: true, // Evita correos duplicados
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: [true, "El username es obligatorio"],
      unique: true,
      trim: true,
    },
    age: {
      type: Number,
      required: [true, "La edad es obligatoria"],
      min: [18, "Debes ser mayor de edad"],
    },
    country: {
      type: String,
      required: [true, "El país es obligatorio"],
    },
    phone: {
      type: String,
      required: [true, "El teléfono es obligatorio"],
    },
    password: {
      type: String,
      required: [true, "La contraseña es obligatoria"],
    },
    role: {
      type: String,
      enum: ["admin", "inspector", "supervisor"],
      default: "inspector",
    },
    tenant_id: {
      type: String,
      required: [true, "El tenant es obligatorio"],
      trim: true,
      lowercase: true,
    },
    estado: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

usuarioSchema.methods.toJSON = function() {
  const { __v, password, _id, ...usuario } = this.toObject();
  usuario.uid = _id; 
  return usuario;
};

usuarioSchema.pre('save', async function() {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.error("Error al hashear la contraseña:", error);
  }
});

usuarioSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const GalaxyUser = mongoose.model("Galaxy_Users", usuarioSchema);
