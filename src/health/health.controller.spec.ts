import { HealthController } from './health.controller';

describe('HealthController', () => {
  const controller = new HealthController();

  it('reports ok with uptime and a timestamp', () => {
    const result = controller.check();

    expect(result.status).toBe('ok');
    expect(typeof result.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
  });
});
