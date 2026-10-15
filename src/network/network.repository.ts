import { Graph } from '../common/types/graph.types';

export abstract class NetworkRepository {
  abstract save(graph: Graph): Promise<Graph>;
  abstract findById(id: string): Promise<Graph | null>;
}
