import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { OptimizeRouteDto } from './optimize-route.dto';

function request(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    originNodeId: 'A',
    destinationNodeId: 'E',
    vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
    departureTime: '12:00',
    ...overrides,
  };
}

async function validateRequest(
  payload: Record<string, unknown>,
): Promise<string> {
  const dto = plainToInstance(OptimizeRouteDto, payload);
  return JSON.stringify(await validate(dto));
}

describe('OptimizeRouteDto validation', () => {
  it('accepts a valid request', async () => {
    expect(await validateRequest(request())).toBe('[]');
  });

  it('accepts waypoints in order', async () => {
    expect(await validateRequest(request({ waypoints: ['C'] }))).toBe('[]');
  });

  it('rejects origin equal to destination without waypoints', async () => {
    const errors = await validateRequest(request({ destinationNodeId: 'A' }));

    expect(errors).toContain('must differ');
  });

  it('allows a round trip when waypoints are present', async () => {
    const errors = await validateRequest(
      request({ destinationNodeId: 'A', waypoints: ['C'] }),
    );

    expect(errors).toBe('[]');
  });

  it('rejects duplicated waypoints', async () => {
    const errors = await validateRequest(request({ waypoints: ['C', 'C'] }));

    expect(errors).toContain('duplicated waypoint');
  });

  it('rejects a waypoint equal to the origin', async () => {
    const errors = await validateRequest(request({ waypoints: ['A'] }));

    expect(errors).toContain('must not equal the origin');
  });

  it('rejects a waypoint equal to the destination', async () => {
    const errors = await validateRequest(request({ waypoints: ['E'] }));

    expect(errors).toContain('must not equal the destination');
  });
});
