import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  incr: vi.fn(),
}));

// A class is used so `new Redis()` works and returns our mock
vi.mock('@upstash/redis', () => ({
  Redis: class {
    constructor() {
      return redisMock;
    }
  },
}));

const { default: app } = await import('../src/index.js');

const ORIGIN = 'http://localhost:5173';

describe('GET /', () => {
  it('returns the health message', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'API is running' });
  });
});

describe('GET /redis-connected', () => {
  it('returns the incremented visit count', async () => {
    redisMock.incr.mockResolvedValue(5);

    const res = await request(app).get('/redis-connected');

    expect(redisMock.incr).toHaveBeenCalledWith('visits');
    expect(res.body).toEqual({ count: 5 });
  });
});

describe('POST /login', () => {
  it('rejects wrong credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'admin@gmail.com', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
    expect(redisMock.set).not.toHaveBeenCalled();
  });

  it('creates a session and sets an httpOnly cookie on success', async () => {
    redisMock.set.mockResolvedValue('OK');

    const res = await request(app)
      .post('/login')
      .send({ email: 'admin@gmail.com', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const [cookie] = res.headers['set-cookie'];
    expect(cookie).toMatch(/^sid=[0-9a-f-]{36};/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=None');

    expect(redisMock.set).toHaveBeenCalledWith(
      expect.stringMatching(/^session:[0-9a-f-]{36}$/),
      { userId: 1, email: 'admin@gmail.com' },
      { ex: 300 },
    );
  });

  it('returns 500 when redis fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    redisMock.set.mockRejectedValue(new Error('redis down'));

    const res = await request(app)
      .post('/login')
      .send({ email: 'admin@gmail.com', password: 'password' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Server error' });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('GET /me', () => {
  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Not authenticated' });
  });

  it('returns 401 when the session expired', async () => {
    redisMock.get.mockResolvedValue(null);

    const res = await request(app).get('/me').set('Cookie', 'sid=abc123');

    expect(redisMock.get).toHaveBeenCalledWith('session:abc123');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Session expired' });
  });

  it('returns the user with a valid session', async () => {
    redisMock.get.mockResolvedValue({ userId: 1, email: 'admin@gmail.com' });

    const res = await request(app).get('/me').set('Cookie', 'sid=abc123');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: 'admin', id: 1 });
  });
});

describe('POST /logout', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/logout');

    expect(res.status).toBe(401);
    expect(redisMock.del).not.toHaveBeenCalled();
  });

  it('deletes the session and clears the cookie', async () => {
    redisMock.get.mockResolvedValue({ userId: 1, email: 'admin@gmail.com' });
    redisMock.del.mockResolvedValue(1);

    const res = await request(app).post('/logout').set('Cookie', 'sid=abc123');

    expect(redisMock.del).toHaveBeenCalledWith('session:abc123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(res.headers['set-cookie'][0]).toMatch(/^sid=;/);
  });
});

describe('CORS', () => {
  beforeEach(() => {
    redisMock.incr.mockResolvedValue(1);
  });

  it('allows the configured frontend origin', async () => {
    const res = await request(app).get('/').set('Origin', ORIGIN);

    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('rejects unknown origins', async () => {
    const res = await request(app).get('/').set('Origin', 'http://evil.com');

    expect(res.status).toBe(500);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
