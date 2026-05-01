import "dotenv/config";

export const config = {
  PORT: process.env.PORT || 1331,
  dbUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  aws: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region:          process.env.AWS_REGION,
    bucket:          process.env.AWS_S3_BUCKET,
  },
  bedrock: {
    modelHaiku:  "anthropic.claude-3-5-haiku-20241022-v1:0",
    modelSonnet: "anthropic.claude-3-5-sonnet-20241022-v2:0",
  },
  redis: {
    url:  process.env.REDIS_URL,
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT) || 6379,
  },
  sessionTTL: 60 * 60 * 24, // 24h en segundos — una jornada de trabajo
};
