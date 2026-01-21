const { isWithinFreeMinutes } = require('../controllers/entrySessions');

describe('entry session freeMinutes grace period', () => {
  test('under freeMinutes => free', () => {
    const entryTime = new Date('2026-01-21T08:00:00.000Z');
    const exitTime = new Date('2026-01-21T08:10:00.000Z');
    expect(isWithinFreeMinutes(entryTime, exitTime, 15)).toBe(true);
  });

  test('equal to freeMinutes => free', () => {
    const entryTime = new Date('2026-01-21T08:00:00.000Z');
    const exitTime = new Date('2026-01-21T08:15:00.000Z');
    expect(isWithinFreeMinutes(entryTime, exitTime, 15)).toBe(true);
  });

  test('over freeMinutes => not free', () => {
    const entryTime = new Date('2026-01-21T08:00:00.000Z');
    const exitTime = new Date('2026-01-21T08:16:00.000Z');
    expect(isWithinFreeMinutes(entryTime, exitTime, 15)).toBe(false);
  });

  test('freeMinutes <= 0 disables grace period', () => {
    const entryTime = new Date('2026-01-21T08:00:00.000Z');
    const exitTime = new Date('2026-01-21T08:01:00.000Z');
    expect(isWithinFreeMinutes(entryTime, exitTime, 0)).toBe(false);
    expect(isWithinFreeMinutes(entryTime, exitTime, -1)).toBe(false);
  });
});
