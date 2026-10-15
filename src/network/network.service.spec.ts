import { NotFoundException } from '@nestjs/common';
import { InMemoryNetworkRepository } from './in-memory-network.repository';
import { NetworkService } from './network.service';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(() => {
    service = new NetworkService(new InMemoryNetworkRepository());
  });

  const edge = (from: string, to: string) => ({ from, to, cost: 1 });

  it('derives nodes from edge endpoints', async () => {
    const graph = await service.create([edge('A', 'B'), edge('B', 'C')]);

    expect(new Set(graph.nodes)).toEqual(new Set(['A', 'B', 'C']));
    await expect(service.getNodes(graph.id)).resolves.toEqual(graph.nodes);
  });

  it('applies defaults for optional edge attributes', async () => {
    const graph = await service.create([edge('A', 'B')]);

    expect(graph.edges[0]).toMatchObject({
      maxWeight: Number.POSITIVE_INFINITY,
      noHazardous: false,
      trafficMultiplier: 1,
    });
  });

  it('throws when the network does not exist', async () => {
    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
