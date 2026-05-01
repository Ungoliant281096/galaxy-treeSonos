import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const USE_MOCK = process.env.NODE_ENV !== "production";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadAudio = async (buffer, key, mimetype) => {
  if (USE_MOCK) {
    console.log(`[S3 MOCK] Upload simulado → s3://${process.env.AWS_S3_BUCKET}/${key}`);
    return key;
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  return key;
};
