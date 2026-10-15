import { Model } from 'mongoose';
import { Graph } from '../../common/types/graph.types';
import { MongoNetworkRepository } from './mongo-network.repository';
import { NetworkDocument } from './network.schema';

const STORED_GRAPH: Graph = {
  id: 'g1',
  edges: [
    {
      from: 'A',
      to: 'B',
      cost: 10,
      maxWeight: 5000,
      noHazardous: true,
      trafficMultiplier: 1.5,
    },
  ],
  nodes: ['A', 'B'],
  createdAt: new Date(0),
};

function toDocument(graph: Graph): NetworkDocument {
  return { ...graph, _id: graph.id } as unknown as NetworkDocument;
}

function setup(document: NetworkDocument | null) {
  const create = jest.fn().mockResolvedValue(document);
  const exec = jest.fn().mockResolvedValue(document);
  const findById = jest.fn().mockReturnValue({ exec });
  const model = { create, findById } as unknown as Model<NetworkDocument>;

  return {
    repository: new MongoNetworkRepository(model),
    create,
    exec,
    findById,
  };
}

describe('MongoNetworkRepository', () => {
  it('persists a graph and maps the stored document back', async () => {
    const { repository, create } = setup(toDocument(STORED_GRAPH));

    const saved = await repository.save(STORED_GRAPH);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'g1', nodes: ['A', 'B'] }),
    );
    expect(saved).toEqual(STORED_GRAPH);
  });

  it('loads a graph by id', async () => {
    const { repository, findById } = setup(toDocument(STORED_GRAPH));

    const found = await repository.findById('g1');

    expect(findById).toHaveBeenCalledWith('g1');
    expect(found).toEqual(STORED_GRAPH);
  });

  it('returns null when the graph is missing', async () => {
    const { repository } = setup(null);

    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
