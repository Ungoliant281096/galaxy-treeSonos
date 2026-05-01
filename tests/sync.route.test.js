import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.stubEnv('NODE_ENV', 'test');

// Mock Dictamen para evitar MongoDB en unit tests
vi.mock('../models/Dictamen.model.js', () => ({
  Dictamen: {
    findOneAndUpdate: vi.fn().mockResolvedValue({ _id: 'dict_1' }),
  },
}));

// Mock authMiddleware — inyecta usuario sin verificar JWT
vi.mock('../middlewares/auth.middleware.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.usuario = { uid: 'inspector_1', tenant_id: 'coyoacan', role: 'inspector' };
    next();
  },
}));

const { default: syncRoutes } = await import('../routes/sync.routes.js');
const app = express();
app.use(express.json());
app.use('/api/galaxy', syncRoutes);

describe('POST /api/galaxy/sync', () => {
  it('400 si dictamenes está vacío', async () => {
    const res = await request(app).post('/api/galaxy/sync').send({ dictamenes: [] });
    expect(res.status).toBe(400);
  });

  it('400 si dictamenes no es array', async () => {
    const res = await request(app).post('/api/galaxy/sync').send({ dictamenes: 'malo' });
    expect(res.status).toBe(400);
  });

  it('400 si hay más de 50 dictámenes', async () => {
    const muchos = Array.from({ length: 51 }, (_, i) => ({ _id: `id_${i}` }));
    const res = await request(app).post('/api/galaxy/sync').send({ dictamenes: muchos });
    expect(res.status).toBe(400);
  });

  it('200 con dictámenes válidos, devuelve sincronizados', async () => {
    const res = await request(app)
      .post('/api/galaxy/sync')
      .send({ dictamenes: [{ _id: 'dict_1', tipo_elemento: 'arbol' }] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sincronizados', 1);
    expect(res.body).toHaveProperty('fallidos', 0);
  });

  it('contabiliza fallidos si un dictamen no tiene _id', async () => {
    const res = await request(app)
      .post('/api/galaxy/sync')
      .send({ dictamenes: [{ tipo_elemento: 'arbol' }] }); // sin _id
    expect(res.status).toBe(200);
    expect(res.body.fallidos).toBe(1);
    expect(res.body.detalle[0]).toHaveProperty('error');
  });
});
