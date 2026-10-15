import { Injectable } from '@nestjs/common';
import { Graph } from '../common/types/graph.types';
import { NetworkRepository } from './network.repository';

/**
 * In-memory fallback used when no `MONGO_URI` is configured. Keeps only the
 * most recent networks (the oldest is evicted), matching the project brief.
 */
@Injectable()
export class InMemoryNetworkRepository extends NetworkRepository {
  private static readonly MAX_GRAPHS = 5;

  private readonly graphs = new Map<string, Graph>();

  save(graph: Graph): Promise<Graph> {
    this.graphs.set(graph.id, graph);
    this.evictOldest();
    return Promise.resolve(graph);
  }

  findById(id: string): Promise<Graph | null> {
    return Promise.resolve(this.graphs.get(id) ?? null);
  }

  private evictOldest(): void {
    while (this.graphs.size > InMemoryNetworkRepository.MAX_GRAPHS) {
      const [oldest] = this.graphs.keys();
      if (oldest === undefined) {
        break;
      }
      this.graphs.delete(oldest);
    }
  }
}
