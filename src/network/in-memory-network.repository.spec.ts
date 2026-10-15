import { Graph } from '../common/types/graph.types';
import { InMemoryNetworkRepository } from './in-memory-network.repository';

function graph(id: string): Graph {
  return { id, edges: [], nodes: [], createdAt: new Date(0) };
}

describe('InMemoryNetworkRepository', () => {
  let repository: InMemoryNetworkRepository;

  beforeEach(() => {
    repository = new InMemoryNetworkRepository();
  });

  it('saves and retrieves a graph', async () => {
    await repository.save(graph('a'));

    await expect(repository.findById('a')).resolves.toMatchObject({ id: 'a' });
  });

  it('returns null for an unknown id', async () => {
    await expect(repository.findById('missing')).resolves.toBeNull();
  });

  it('keeps only the last five graphs', async () => {
    for (const id of ['1', '2', '3', '4', '5', '6']) {
      await repository.save(graph(id));
    }

    await expect(repository.findById('1')).resolves.toBeNull();
    await expect(repository.findById('6')).resolves.toMatchObject({ id: '6' });
  });
});
