import { Graph, GraphEdge, RouteRequest } from '../../common/types/graph.types';
import { RouteErrorCode } from '../interfaces/job.types';
import { RoutingEngine, RoutingError } from './routing.engine';

function edge(
  from: string,
  to: string,
  cost: number,
  overrides: Partial<GraphEdge> = {},
): GraphEdge {
  return {
    from,
    to,
    cost,
    maxWeight: Number.POSITIVE_INFINITY,
    noHazardous: false,
    trafficMultiplier: 1,
    ...overrides,
  };
}

const README_EDGES: GraphEdge[] = [
  edge('A', 'B', 10, { maxWeight: 10000, trafficMultiplier: 1 }),
  edge('A', 'C', 15, {
    maxWeight: 5000,
    noHazardous: true,
    trafficMultiplier: 1.5,
  }),
  edge('B', 'D', 12, { maxWeight: 10000, trafficMultiplier: 2 }),
  edge('C', 'D', 5, {
    maxWeight: 5000,
    noHazardous: true,
    trafficMultiplier: 1,
  }),
  edge('D', 'E', 10, { maxWeight: 8000, trafficMultiplier: 1.2 }),
];

function buildGraph(edges: GraphEdge[] = README_EDGES): Graph {
  const nodes = new Set<string>();
  for (const e of edges) {
    nodes.add(e.from);
    nodes.add(e.to);
  }
  return { id: 'test-graph', edges, nodes: [...nodes], createdAt: new Date(0) };
}

function request(overrides: Partial<RouteRequest> = {}): RouteRequest {
  return {
    originNodeId: 'A',
    destinationNodeId: 'E',
    waypoints: [],
    vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
    departureTime: '12:00',
    ...overrides,
  };
}

describe('RoutingEngine', () => {
  const engine = new RoutingEngine();

  describe('README validation cases', () => {
    it('Test Case 1: light non-hazardous vehicle takes A -> C -> D -> E', () => {
      const result = engine.findRoute(buildGraph(), request());

      expect(result.path).toEqual(['A', 'C', 'D', 'E']);
      expect(result.totalCost).toBe(30);
    });

    it('Test Case 2: heavy vehicle is rerouted through B', () => {
      const result = engine.findRoute(
        buildGraph(),
        request({
          vehicleProfile: { type: 'truck', weight: 6000, hazardous: false },
        }),
      );

      expect(result.path).toEqual(['A', 'B', 'D', 'E']);
      expect(result.totalCost).toBe(32);
    });

    it('Test Case 3: hazardous vehicle is rerouted through B', () => {
      const result = engine.findRoute(
        buildGraph(),
        request({
          vehicleProfile: { type: 'truck', weight: 3000, hazardous: true },
        }),
      );

      expect(result.path).toEqual(['A', 'B', 'D', 'E']);
      expect(result.totalCost).toBe(32);
    });
  });

  describe('time-dependent weights', () => {
    it('applies traffic multipliers inside the morning peak window', () => {
      const result = engine.findRoute(
        buildGraph(),
        request({ departureTime: '08:00' }),
      );

      expect(result.path).toEqual(['A', 'C', 'D', 'E']);
      expect(result.totalCost).toBeCloseTo(39.5);
    });

    it('applies traffic multipliers inside the evening peak window', () => {
      const result = engine.findRoute(
        buildGraph(),
        request({ departureTime: '18:00' }),
      );

      expect(result.path).toEqual(['A', 'C', 'D', 'E']);
      expect(result.totalCost).toBeCloseTo(39.5);
    });

    it('ignores multipliers outside peak hours', () => {
      const result = engine.findRoute(
        buildGraph(),
        request({ departureTime: '12:00' }),
      );

      expect(result.totalCost).toBe(30);
    });

    it('treats the peak window as start-inclusive and end-exclusive', () => {
      const atStart = engine.findRoute(
        buildGraph(),
        request({ departureTime: '07:00' }),
      );
      const atEnd = engine.findRoute(
        buildGraph(),
        request({ departureTime: '09:00' }),
      );

      expect(atStart.totalCost).toBeCloseTo(39.5);
      expect(atEnd.totalCost).toBe(30);
    });
  });

  describe('multi-stop routing', () => {
    it('visits a single waypoint in order', () => {
      const result = engine.findRoute(
        buildGraph(),
        request({
          originNodeId: 'A',
          destinationNodeId: 'E',
          waypoints: ['B'],
        }),
      );

      expect(result.path).toEqual(['A', 'B', 'D', 'E']);
      expect(result.totalCost).toBe(32);
    });

    it('stitches multiple waypoints without duplicating joints', () => {
      const graph = buildGraph([
        edge('A', 'B', 1),
        edge('B', 'C', 1),
        edge('C', 'D', 1),
      ]);

      const result = engine.findRoute(
        graph,
        request({
          originNodeId: 'A',
          destinationNodeId: 'D',
          waypoints: ['B', 'C'],
        }),
      );

      expect(result.path).toEqual(['A', 'B', 'C', 'D']);
      expect(result.totalCost).toBe(3);
    });
  });

  describe('error handling', () => {
    function captureError(run: () => unknown): RoutingError {
      try {
        run();
      } catch (error) {
        return error as RoutingError;
      }
      throw new Error('expected the engine to throw');
    }

    it('rejects unknown nodes with UNKNOWN_NODE', () => {
      const error = captureError(() =>
        engine.findRoute(buildGraph(), request({ originNodeId: 'Z' })),
      );

      expect(error).toBeInstanceOf(RoutingError);
      expect(error.code).toBe(RouteErrorCode.UNKNOWN_NODE);
    });

    it('rejects unreachable destinations with NO_ROUTE', () => {
      const graph = buildGraph([edge('A', 'B', 1), edge('C', 'D', 1)]);

      const error = captureError(() =>
        engine.findRoute(
          graph,
          request({ originNodeId: 'A', destinationNodeId: 'D' }),
        ),
      );

      expect(error.code).toBe(RouteErrorCode.NO_ROUTE);
    });

    it('rejects a route made impossible by constraints with NO_ROUTE', () => {
      const graph = buildGraph([edge('A', 'B', 1, { maxWeight: 100 })]);

      const error = captureError(() =>
        engine.findRoute(
          graph,
          request({
            originNodeId: 'A',
            destinationNodeId: 'B',
            vehicleProfile: { type: 'truck', weight: 5000, hazardous: false },
          }),
        ),
      );

      expect(error.code).toBe(RouteErrorCode.NO_ROUTE);
    });
  });
});
