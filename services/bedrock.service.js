import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";

// Haiku: extracción rutinaria (barato, rápido)
// Sonnet: casos ambiguos cuando confidence < 0.7
export const MODELS = {
  haiku:  "anthropic.claude-3-5-haiku-20241022-v1:0",
  sonnet: "anthropic.claude-3-5-sonnet-20241022-v2:0",
};

const USE_MOCK = process.env.USE_BEDROCK !== "true";

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ─── System prompt ────────────────────────────────────────────────────────────
// Conciso para minimizar tokens de entrada (~300 tokens)
const SYSTEM_PROMPT = `Eres un experto en dictaminación de arbolado urbano bajo la norma NADF-001-RNAT-2015 de la Ciudad de México.

Tu única tarea es extraer el valor de un campo específico del formulario de dictamen técnico a partir del texto dictado por el inspector en campo.

Reglas de extracción:
- Numéricos: extrae SOLO el número en la unidad correcta (metros para altura/copa, centímetros para diámetro). Si dice "metro y medio" → 1.5
- Texto libre: limpia muletillas ("este", "eh", "bueno") y normaliza
- Enumerados: mapea al valor exacto de la lista válida más cercano
- Si el inspector claramente no respondió el campo o dijo "no sé" → confidence 0.1
- Si la respuesta es ambigua pero interpretable → confidence entre 0.5 y 0.7
- Si la respuesta es clara → confidence mayor a 0.8

Siempre usa la herramienta guardar_campo. Nunca respondas en texto libre.`;

// ─── Tool definition ──────────────────────────────────────────────────────────
const GUARDAR_CAMPO_TOOL = {
  toolSpec: {
    name: "guardar_campo",
    description: "Guarda el valor extraído del campo del dictamen técnico urbano",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          valor: {
            description: "Valor extraído y normalizado. Null si no se pudo extraer.",
          },
          confidence: {
            type:        "number",
            minimum:     0,
            maximum:     1,
            description: "Certeza de la extracción entre 0 y 1",
          },
          razonamiento: {
            type:        "string",
            description: "Explicación breve de por qué se extrajo ese valor",
          },
        },
        required: ["valor", "confidence", "razonamiento"],
      },
    },
  },
};

/**
 * Llama a Claude via Bedrock para extraer el valor de un campo del dictamen.
 *
 * @param {string} campo_id     - Identificador del campo (ej: "altura_total")
 * @param {string} descripcion  - Descripción del campo para Claude (ej: "Altura total del árbol en metros")
 * @param {string} transcript   - Texto dictado por el inspector
 * @param {string[]} valoresValidos - Opcional: lista de valores enum permitidos
 * @param {string} model        - MODELS.haiku o MODELS.sonnet
 */
export const extraerCampo = async ({
  campo_id,
  descripcion,
  transcript,
  valoresValidos = [],
  model = MODELS.haiku,
}) => {
  if (USE_MOCK) {
    console.log(`[BEDROCK MOCK] Extrayendo campo "${campo_id}" de: "${transcript}"`);
    return mockExtraccion(campo_id, transcript);
  }

  const enumContext = valoresValidos.length
    ? `\nValores válidos para este campo: ${valoresValidos.join(", ")}`
    : "";

  const userMessage = `Campo a extraer: "${campo_id}" — ${descripcion}${enumContext}

El inspector dijo: "${transcript}"`;

  const command = new ConverseCommand({
    modelId: model,
    system: [{ text: SYSTEM_PROMPT }],
    messages: [{ role: "user", content: [{ text: userMessage }] }],
    toolConfig: {
      tools: [GUARDAR_CAMPO_TOOL],
      // Forzar que Claude SIEMPRE use la herramienta — respuesta predecible
      toolChoice: { tool: { name: "guardar_campo" } },
    },
    inferenceConfig: {
      maxTokens:   256,
      temperature: 0.1, // baja temperatura = extracción más determinista
    },
  });

  const response = await client.send(command);

  // La respuesta con tool use siempre viene en el primer content block
  const toolUse = response.output.message.content.find((b) => b.toolUse);
  if (!toolUse) throw new Error("BEDROCK_NO_TOOL_RESPONSE");

  return {
    valor:         toolUse.toolUse.input.valor,
    confidence:    toolUse.toolUse.input.confidence,
    razonamiento:  toolUse.toolUse.input.razonamiento,
    model_usado:   model,
    tokens_usados: {
      input:  response.usage.inputTokens,
      output: response.usage.outputTokens,
    },
  };
};

// ─── Mock inteligente para desarrollo ────────────────────────────────────────
// Simula la lógica de Claude con reglas simples para no gastar tokens en dev
const mockExtraccion = (campo_id, transcript) => {
  const numberMatch = transcript.match(/[\d]+([.,]\d+)?/);
  const numero = numberMatch ? parseFloat(numberMatch[0].replace(",", ".")) : null;

  const esNumerico = [
    "altura_total", "diametro_tronco", "ancho_copa",
    "largo_copa", "distancia_follaje", "expectativa_vida",
  ].includes(campo_id);

  if (esNumerico && numero !== null) {
    return {
      valor:        numero,
      confidence:   0.9,
      razonamiento: `[MOCK] Número extraído directamente del transcript`,
      model_usado:  "mock",
    };
  }

  if (!esNumerico && transcript.trim().length > 2) {
    return {
      valor:        transcript.trim(),
      confidence:   0.85,
      razonamiento: `[MOCK] Texto normalizado`,
      model_usado:  "mock",
    };
  }

  return {
    valor:        null,
    confidence:   0.1,
    razonamiento: `[MOCK] No se pudo extraer un valor claro`,
    model_usado:  "mock",
  };
};
