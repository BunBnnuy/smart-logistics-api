import { MinPriorityQueue } from './priority-queue';

export interface WeightedEdge {
  to: string;
  cost: number;
}

export type AdjacencyList = Map<string, WeightedEdge[]>;

export interface PathResult {
  path: string[];
  cost: number;
}

/**
 * Dijkstra's shortest path on a non-negative weighted directed graph.
 * Returns `null` when the destination is unreachable from the origin.
 */
export function shortestPath(
  adjacency: AdjacencyList,
  from: string,
  to: string,
): PathResult | null {
  if (!adjacency.has(from) || !adjacency.has(to)) {
    return null;
  }
  if (from === to) {
    return { path: [from], cost: 0 };
  }

  const distances = new Map<string, number>([[from, 0]]);
  const previous = new Map<string, string>();
  const settled = new Set<string>();
  const queue = new MinPriorityQueue<string>();
  queue.push(from, 0);

  while (!queue.isEmpty()) {
    const entry = queue.pop();
    if (entry === undefined) {
      break;
    }
    const node = entry.value;
    if (settled.has(node)) {
      continue;
    }
    settled.add(node);
    if (node === to) {
      break;
    }

    const neighbours = adjacency.get(node) ?? [];
    for (const edge of neighbours) {
      if (settled.has(edge.to)) {
        continue;
      }
      const candidate =
        (distances.get(node) ?? Number.POSITIVE_INFINITY) + edge.cost;
      if (candidate < (distances.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.to, candidate);
        previous.set(edge.to, node);
        queue.push(edge.to, candidate);
      }
    }
  }

  const totalCost = distances.get(to);
  if (totalCost === undefined) {
    return null;
  }

  return { path: rebuildPath(previous, from, to), cost: totalCost };
}

function rebuildPath(
  previous: Map<string, string>,
  from: string,
  to: string,
): string[] {
  const path: string[] = [];
  let current: string | undefined = to;
  while (current !== undefined) {
    path.push(current);
    if (current === from) {
      break;
    }
    current = previous.get(current);
  }
  return path.reverse();
}
