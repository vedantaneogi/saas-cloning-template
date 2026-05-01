import { test, expect } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:8000';

test.describe('Universal RL Environment Endpoints', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('GET /ready returns 200 after seed', async ({ request }) => {
    const res = await request.get(`${API}/ready`);
    expect(res.status()).toBe(200);
  });

  test('GET /clock returns ISO time', async ({ request }) => {
    const res = await request.get(`${API}/clock`);
    expect(res.status()).toBe(200);
    const { time } = await res.json();
    expect(new Date(time).toString()).not.toBe('Invalid Date');
  });

  test('POST /clock/advance moves time forward', async ({ request }) => {
    const before = (await (await request.get(`${API}/clock`)).json()).time;
    await request.post(`${API}/clock/advance`, { data: { duration: 'PT1H' } });
    const after = (await (await request.get(`${API}/clock`)).json()).time;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  test('GET /snapshot returns state JSON', async ({ request }) => {
    const res = await request.get(`${API}/snapshot`);
    expect(res.status()).toBe(200);
  });

  test('POST /reset returns status reset', async ({ request }) => {
    const res = await request.post(`${API}/reset`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('reset');
  });

  test('POST /verify evaluates predicate', async ({ request }) => {
    const res = await request.post(`${API}/verify`, {
      data: { path: 'user.role', operator: 'eq', expected: 'worker' },
    });
    expect(res.status()).toBe(200);
    expect(typeof (await res.json()).result).toBe('boolean');
  });

  test('GET /events returns event log array', async ({ request }) => {
    const res = await request.get(`${API}/events`);
    expect(res.status()).toBe(200);
    expect(Array.isArray((await res.json()).events)).toBe(true);
  });
});
