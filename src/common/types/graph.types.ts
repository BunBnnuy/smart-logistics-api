export interface GraphEdge {
  from: string;
  to: string;
  cost: number;
  maxWeight: number;
  noHazardous: boolean;
  trafficMultiplier: number;
}

export interface Graph {
  id: string;
  edges: GraphEdge[];
  nodes: string[];
  createdAt: Date;
}

export interface VehicleProfile {
  type: string;
  weight: number;
  hazardous: boolean;
}

export interface RouteRequest {
  originNodeId: string;
  destinationNodeId: string;
  waypoints: string[];
  vehicleProfile: VehicleProfile;
  departureTime: string;
}

export interface RouteComputation {
  path: string[];
  totalCost: number;
}
