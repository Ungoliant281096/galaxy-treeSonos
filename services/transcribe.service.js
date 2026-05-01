import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";

const USE_MOCK = process.env.NODE_ENV !== "production";
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 40; // 2 minutos máximo

const transcribe = new TranscribeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const startTranscriptionJob = async (s3Key, jobName) => {
  if (USE_MOCK) {
    console.log(`[TRANSCRIBE MOCK] Job iniciado → ${jobName}`);
    return jobName;
  }

  await transcribe.send(
    new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: "es-MX",
      MediaFormat: s3Key.split(".").pop(),
      Media: {
        MediaFileUri: `s3://${process.env.AWS_S3_BUCKET}/${s3Key}`,
      },
    })
  );

  return jobName;
};

export const pollTranscriptionResult = async (jobName) => {
  if (USE_MOCK) {
    console.log(`[TRANSCRIBE MOCK] Resultado simulado para → ${jobName}`);
    return {
      transcript: "el árbol mide aproximadamente cinco metros de altura",
      confidence: 0.95,
    };
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { TranscriptionJob } = await transcribe.send(
      new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
    );

    const status = TranscriptionJob.TranscriptionJobStatus;

    if (status === "COMPLETED") {
      const response = await fetch(TranscriptionJob.Transcript.TranscriptFileUri);
      const data = await response.json();
      const items = data.results.items;
      const transcript = data.results.transcripts[0].transcript;
      const confidence =
        items
          .filter((i) => i.type === "pronunciation" && i.alternatives[0].confidence)
          .reduce((sum, i) => sum + parseFloat(i.alternatives[0].confidence), 0) /
        items.filter((i) => i.type === "pronunciation").length;

      return { transcript, confidence: parseFloat(confidence.toFixed(2)) };
    }

    if (status === "FAILED") {
      throw new Error(`Transcripción fallida: ${TranscriptionJob.FailureReason}`);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error("TRANSCRIBE_TIMEOUT");
};
