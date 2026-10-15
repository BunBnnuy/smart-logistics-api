import { AdjacencyList, shortestPath } from './dijkstra';

function adjacency(
  entries: Record<string, Array<[string, number]>>,
): AdjacencyList {
  const map: AdjacencyList = new Map();
  for (const [node, edges] of Object.entries(entries)) {
    map.set(
      node,
      edges.map(([to, cost]) => ({ to, cost })),
    );
  }
  return map;
}

describe('shortestPath', () => {
  it('finds the cheapest path', () => {
    const graph = adjacency({
      A: [
        ['B', 10],
        ['C', 15],
      ],
      B: [['D', 12]],
      C: [['D', 5]],
      D: [['E', 10]],
      E: [],
    });

    expect(shortestPath(graph, 'A', 'E')).toEqual({
      path: ['A', 'C', 'D', 'E'],
      cost: 30,
    });
  });

  it('returns zero cost when origin equals destination', () => {
    const graph = adjacency({ A: [] });
    expect(shortestPath(graph, 'A', 'A')).toEqual({ path: ['A'], cost: 0 });
  });

  it('returns null when the destination is unreachable', () => {
    const graph = adjacency({ A: [['B', 1]], B: [], C: [] });
    expect(shortestPath(graph, 'A', 'C')).toBeNull();
  });

  it('returns null when a node is unknown', () => {
    const graph = adjacency({ A: [] });
    expect(shortestPath(graph, 'A', 'Z')).toBeNull();
  });

  it('does not stop at a cheap dead end', () => {
    const graph = adjacency({
      A: [
        ['B', 1],
        ['C', 5],
      ],
      B: [],
      C: [['D', 5]],
      D: [],
    });

    expect(shortestPath(graph, 'A', 'D')).toEqual({
      path: ['A', 'C', 'D'],
      cost: 10,
    });
  });

  it('breaks cost ties deterministically', () => {
    const graph = adjacency({
      A: [
        ['B', 1],
        ['C', 1],
      ],
      B: [['D', 1]],
      C: [['D', 1]],
      D: [],
    });

    const result = shortestPath(graph, 'A', 'D');
    expect(result?.cost).toBe(2);
    expect(result?.path).toEqual(['A', 'B', 'D']);
  });
});
