import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Graph, GraphEdge } from '../../common/types/graph.types';
import { NetworkRepository } from '../network.repository';
import { NetworkDocument, NetworkEntity } from './network.schema';

@Injectable()
export class MongoNetworkRepository extends NetworkRepository {
  constructor(
    @InjectModel(NetworkEntity.name)
    private readonly model: Model<NetworkDocument>,
  ) {
    super();
  }

  async save(graph: Graph): Promise<Graph> {
    const document = await this.model.create({
      _id: graph.id,
      edges: graph.edges,
      nodes: graph.nodes,
      createdAt: graph.createdAt,
    });
    return this.toGraph(document);
  }

  async findById(id: string): Promise<Graph | null> {
    const document = await this.model.findById(id).exec();
    return document ? this.toGraph(document) : null;
  }

  private toGraph(document: NetworkDocument): Graph {
    return {
      id: document._id,
      edges: document.edges.map((edge): GraphEdge => ({
        from: edge.from,
        to: edge.to,
        cost: edge.cost,
        maxWeight: edge.maxWeight,
        noHazardous: edge.noHazardous,
        trafficMultiplier: edge.trafficMultiplier,
      })),
      nodes: [...document.nodes],
      createdAt: document.createdAt,
    };
  }
}
