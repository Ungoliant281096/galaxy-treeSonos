import { Dictamen } from "../models/Dictamen.model.js";

let _io;

/**
 * Inicia el Change Stream de MongoDB y emite eventos via Socket.io.
 * DDIA Cap 11: stream processing — reaccionar a cambios en tiempo real.
 *
 * Eventos emitidos al room `tenant:{tenant_id}`:
 *  - dictamen:nuevo      → nuevo dictamen creado
 *  - dictamen:estado     → cambio de estado
 */
export function iniciarChangeStream(io) {
  _io = io;

  // Escuchar solo inserts y updates relevantes
  const pipeline = [
    {
      $match: {
        operationType: { $in: ["insert", "update"] },
      },
    },
  ];

  const stream = Dictamen.watch(pipeline, { fullDocument: "updateLookup" });

  stream.on("change", (change) => {
    const doc       = change.fullDocument;
    if (!doc) return;
    const room      = `tenant:${doc.tenant_id}`;

    if (change.operationType === "insert") {
      io.to(room).emit("dictamen:nuevo", {
        _id:          doc._id,
        inspector_id: doc.inspector_id,
        estado:       doc.estado,
        createdAt:    doc.createdAt,
      });
    }

    if (change.operationType === "update") {
      const campos = change.updateDescription?.updatedFields || {};
      if ("estado" in campos) {
        io.to(room).emit("dictamen:estado", {
          _id:    doc._id,
          estado: doc.estado,
        });
      }
    }
  });

  stream.on("error", (err) => {
    console.error("[ChangeStream] Error:", err.message);
    // Reconexión automática de Mongoose al reconectar MongoDB
  });

  console.log("[ChangeStream] Escuchando cambios en dictámenes");
}
