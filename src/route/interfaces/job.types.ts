import { RouteRequest } from '../../common/types/graph.types';

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum RouteErrorCode {
  NO_ROUTE = 'NO_ROUTE',
  UNKNOWN_NODE = 'UNKNOWN_NODE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export interface RouteError {
  code: RouteErrorCode;
  message: string;
}

export interface RouteResult {
  graphId: string;
  totalCost: number;
  path: string[];
  durationMs: number;
}

export interface RouteJob {
  jobId: string;
  graphId: string;
  status: JobStatus;
  request: RouteRequest;
  result?: RouteResult;
  error?: RouteError;
  createdAt: Date;
  updatedAt: Date;
}
