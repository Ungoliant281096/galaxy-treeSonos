import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('NODE_ENV', 'test');

const { extraerValorCampo } = await import('../services/campo.extractor.js');

describe('extraerValorCampo — mock mode', () => {
  it('extrae altura de un transcript numérico', async () => {
    const result = await extraerValorCampo(
      'altura_total',
      'el árbol mide cinco metros de altura'
    );
    expect(result).toHaveProperty('fieldPath');
    expect(result).toHaveProperty('valor');
    expect(result).toHaveProperty('confidence');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('campo inválido devuelve null', async () => {
    const result = await extraerValorCampo('campo_inexistente', 'texto');
    expect(result).toBeNull();
  });

  it('diametro_tronco devuelve resultado con requiere_revision definido', async () => {
    const result = await extraerValorCampo('diametro_tronco', 'no sé cuánto mide');
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('requiere_revision');
  });
});
