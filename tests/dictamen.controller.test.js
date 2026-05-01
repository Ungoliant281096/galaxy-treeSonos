import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.stubEnv('NODE_ENV', 'test');

const mockDictamenes = [
  { _id: 'dict_1', estado: 'en_progreso', inspector_id: 'insp_1', createdAt: new Date() },
  { _id: 'dict_2', estado: 'aprobado',    inspector_id: 'insp_1', createdAt: new Date() },
];

vi.mock('../models/Dictamen.model.js', () => ({
  Dictamen: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      sort:   vi.fn().mockReturnThis(),
      skip:   vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      lean:   vi.fn().mockResolvedValue(mockDictamenes),
    }),
    countDocuments:   vi.fn().mockResolvedValue(2),
    findOneAndUpdate: vi.fn().mockResolvedValue({ estado: 'aprobado', historial_estados: [] }),
    findOneAndDelete: vi.fn().mockResolvedValue({ _id: 'dict_1' }),
  },
}));

vi.mock('../services/dictamen.service.js', () => ({
  getDictamen: vi.fn().mockResolvedValue({ _id: 'dict_1', estado: 'en_progreso' }),
}));

vi.mock('../middlewares/auth.middleware.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.usuario = { uid: 'insp_1', tenant_id: 'coyoacan', role: 'admin' };
    next();
  },
}));

const { default: dictamenRoutes } = await import('../routes/dictamen.routes.js');
const app = express();
app.use(express.json());
app.use('/api/galaxy/dictamenes', dictamenRoutes);

describe('GET /api/galaxy/dictamenes', () => {
  it('devuelve lista paginada', async () => {
    const res = await request(app).get('/api/galaxy/dictamenes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('400 si estado inválido', async () => {
    const res = await request(app).get('/api/galaxy/dictamenes?estado=inventado');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/galaxy/dictamenes/:id/estado', () => {
  it('200 al cambiar estado válido', async () => {
    const res = await request(app)
      .patch('/api/galaxy/dictamenes/dict_1/estado')
      .send({ estado: 'aprobado' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('estado');
  });

  it('400 si estado no está en el enum', async () => {
    const res = await request(app)
      .patch('/api/galaxy/dictamenes/dict_1/estado')
      .send({ estado: 'inventado' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/galaxy/dictamenes/:id', () => {
  it('200 al eliminar como admin', async () => {
    const res = await request(app).delete('/api/galaxy/dictamenes/dict_1');
    expect(res.status).toBe(200);
  });
});
