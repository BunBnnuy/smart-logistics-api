import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Graph, GraphEdge } from '../common/types/graph.types';
import { EdgeDto } from './dto/edge.dto';
import { NetworkRepository } from './network.repository';

@Injectable()
export class NetworkService {
  constructor(private readonly repository: NetworkRepository) {}

  create(edges: EdgeDto[]): Promise<Graph> {
    const normalized = edges.map((edge): GraphEdge => ({
      from: edge.from,
      to: edge.to,
      cost: edge.cost,
      maxWeight: edge.maxWeight ?? Number.POSITIVE_INFINITY,
      noHazardous: edge.noHazardous ?? false,
      trafficMultiplier: edge.trafficMultiplier ?? 1,
    }));

    const graph: Graph = {
      id: randomUUID(),
      edges: normalized,
      nodes: this.collectNodes(normalized),
      createdAt: new Date(),
    };

    return this.repository.save(graph);
  }

  async findById(id: string): Promise<Graph> {
    const graph = await this.repository.findById(id);
    if (!graph) {
      throw new NotFoundException(`Network '${id}' not found`);
    }
    return graph;
  }

  async getNodes(id: string): Promise<string[]> {
    return (await this.findById(id)).nodes;
  }

  private collectNodes(edges: GraphEdge[]): string[] {
    const nodes = new Set<string>();
    for (const edge of edges) {
      nodes.add(edge.from);
      nodes.add(edge.to);
    }
    return [...nodes];
  }
}
