const {
  addMinutes,
  buildDateTime
} = require('../services/appointment-scheduling.service');

describe('appointment scheduling helpers', () => {
  it('builds a date time from appointment date and time slot', () => {
    const value = buildDateTime('2026-06-11', '09:30');

    expect(value).toBeInstanceOf(Date);
    expect(value.toISOString()).toBe('2026-06-11T09:30:00.000Z');
  });

  it('adds duration in minutes without mutating the original date', () => {
    const start = new Date('2026-06-11T09:30:00.000Z');
    const end = addMinutes(start, 90);

    expect(start.toISOString()).toBe('2026-06-11T09:30:00.000Z');
    expect(end.toISOString()).toBe('2026-06-11T11:00:00.000Z');
  });
});
