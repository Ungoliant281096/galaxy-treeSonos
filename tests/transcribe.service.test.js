import { describe, it, expect, vi, beforeEach } from 'vitest';

// Forzar modo mock para todos los tests
vi.stubEnv('NODE_ENV', 'test');

// Importamos después de stubear el env
const { startTranscriptionJob, pollTranscriptionResult } = await import(
  '../services/transcribe.service.js'
);

describe('transcribeService — mock mode', () => {
  it('startTranscriptionJob devuelve el jobName', async () => {
    const result = await startTranscriptionJob('coyoacan/dict_1/audio/campo.wav', 'job-001');
    expect(result).toBe('job-001');
  });

  it('pollTranscriptionResult devuelve transcript y confidence', async () => {
    const result = await pollTranscriptionResult('job-001');
    expect(result).toHaveProperty('transcript');
    expect(result).toHaveProperty('confidence');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.transcript).toBe('string');
    expect(result.transcript.length).toBeGreaterThan(0);
  });
});
