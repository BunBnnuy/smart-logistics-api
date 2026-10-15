import { Injectable } from '@nestjs/common';
import {
  Graph,
  GraphEdge,
  RouteComputation,
  RouteRequest,
  VehicleProfile,
} from '../../common/types/graph.types';
import { AdjacencyList, shortestPath } from './dijkstra';
import { RouteErrorCode } from '../interfaces/job.types';

export class RoutingError extends Error {
  constructor(
    readonly code: RouteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}

/**
 * Peak-hour windows (start inclusive, end exclusive) during which an edge's
 * `trafficMultiplier` is applied to its cost.
 */
const PEAK_WINDOWS: ReadonlyArray<readonly [number, number]> = [
  [7 * 60, 9 * 60],
  [17 * 60, 19 * 60],
];

@Injectable()
export class RoutingEngine {
  findRoute(graph: Graph, request: RouteRequest): RouteComputation {
    this.assertNodesExist(graph, request);

    const adjacency = this.buildAdjacency(graph, request);
    const stops = [
      request.originNodeId,
      ...request.waypoints,
      request.destinationNodeId,
    ];

    const path: string[] = [];
    let totalCost = 0;

    for (let i = 0; i < stops.length - 1; i++) {
      const leg = shortestPath(adjacency, stops[i], stops[i + 1]);
      if (leg === null) {
        throw new RoutingError(
          RouteErrorCode.NO_ROUTE,
          `No route from '${stops[i]}' to '${stops[i + 1]}' under the given constraints`,
        );
      }
      totalCost += leg.cost;
      path.push(...(path.length === 0 ? leg.path : leg.path.slice(1)));
    }

    return { path, totalCost };
  }

  private assertNodesExist(graph: Graph, request: RouteRequest): void {
    const known = new Set(graph.nodes);
    const required = [
      request.originNodeId,
      request.destinationNodeId,
      ...request.waypoints,
    ];
    const missing = required.filter((node) => !known.has(node));
    if (missing.length > 0) {
      throw new RoutingError(
        RouteErrorCode.UNKNOWN_NODE,
        `Unknown node(s): ${[...new Set(missing)].join(', ')}`,
      );
    }
  }

  private buildAdjacency(graph: Graph, request: RouteRequest): AdjacencyList {
    const adjacency: AdjacencyList = new Map();
    for (const node of graph.nodes) {
      adjacency.set(node, []);
    }

    const isPeak = this.isPeakHour(request.departureTime);
    for (const edge of graph.edges) {
      if (!this.isTraversable(edge, request.vehicleProfile)) {
        continue;
      }
      adjacency.get(edge.from)?.push({
        to: edge.to,
        cost: this.effectiveCost(edge, isPeak),
      });
    }
    return adjacency;
  }

  private isTraversable(edge: GraphEdge, vehicle: VehicleProfile): boolean {
    if (vehicle.weight > edge.maxWeight) {
      return false;
    }
    if (vehicle.hazardous && edge.noHazardous) {
      return false;
    }
    return true;
  }

  private effectiveCost(edge: GraphEdge, isPeak: boolean): number {
    return isPeak ? edge.cost * edge.trafficMultiplier : edge.cost;
  }

  private isPeakHour(departureTime: string): boolean {
    const [hours, minutes] = departureTime.split(':').map(Number);
    const timeOfDay = hours * 60 + minutes;
    return PEAK_WINDOWS.some(
      ([start, end]) => timeOfDay >= start && timeOfDay < end,
    );
  }
}
