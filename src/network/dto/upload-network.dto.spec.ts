import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UploadNetworkDto } from './upload-network.dto';

async function validateEdges(edges: unknown[]): Promise<string> {
  const dto = plainToInstance(UploadNetworkDto, { edges });
  const errors = await validate(dto);
  return JSON.stringify(errors);
}

describe('UploadNetworkDto edge list validation', () => {
  it('accepts a valid edge list', async () => {
    const errors = await validateEdges([
      { from: 'A', to: 'B', cost: 10 },
      { from: 'B', to: 'C', cost: 5 },
    ]);

    expect(errors).toBe('[]');
  });

  it('accepts bidirectional edges (A -> B and B -> A)', async () => {
    const errors = await validateEdges([
      { from: 'A', to: 'B', cost: 10 },
      { from: 'B', to: 'A', cost: 10 },
    ]);

    expect(errors).toBe('[]');
  });

  it('rejects self-loops', async () => {
    const errors = await validateEdges([{ from: 'A', to: 'A', cost: 1 }]);

    expect(errors).toContain('self-loop');
  });

  it('rejects duplicated edges', async () => {
    const errors = await validateEdges([
      { from: 'A', to: 'B', cost: 10 },
      { from: 'A', to: 'B', cost: 10 },
    ]);

    expect(errors).toContain('duplicated edge');
  });

  it('rejects parallel edges with different costs', async () => {
    const errors = await validateEdges([
      { from: 'A', to: 'B', cost: 10 },
      { from: 'A', to: 'B', cost: 5 },
    ]);

    expect(errors).toContain('parallel edges');
  });

  it('rejects blank node ids', async () => {
    const errors = await validateEdges([{ from: ' ', to: 'B', cost: 1 }]);

    expect(errors).toContain('whitespace');
  });

  it('rejects node ids with surrounding whitespace', async () => {
    const errors = await validateEdges([{ from: ' A ', to: 'B', cost: 1 }]);

    expect(errors).toContain('whitespace');
  });

  it('rejects a trafficMultiplier of zero or less', async () => {
    const errors = await validateEdges([
      { from: 'A', to: 'B', cost: 1, trafficMultiplier: 0 },
    ]);

    expect(errors).not.toBe('[]');
  });

  it('accepts a trafficMultiplier greater than zero', async () => {
    const errors = await validateEdges([
      { from: 'A', to: 'B', cost: 1, trafficMultiplier: 1.5 },
    ]);

    expect(errors).toBe('[]');
  });
});
