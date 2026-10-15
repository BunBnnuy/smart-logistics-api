import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Graph, RouteRequest } from '../common/types/graph.types';
import { NetworkService } from '../network/network.service';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import { RouteStatusResponseDto } from './dto/route-response.dto';
import {
  JobStatus,
  RouteError,
  RouteErrorCode,
  RouteJob,
} from './interfaces/job.types';
import { RoutingEngine, RoutingError } from './routing/routing.engine';

@Injectable()
export class RouteService {
  private readonly jobs = new Map<string, RouteJob>();

  constructor(
    private readonly networkService: NetworkService,
    private readonly routingEngine: RoutingEngine,
  ) {}

  async enqueue(graphId: string, dto: OptimizeRouteDto): Promise<RouteJob> {
    const graph = await this.networkService.findById(graphId);

    const now = new Date();
    const job: RouteJob = {
      jobId: `job-${randomUUID()}`,
      graphId: graph.id,
      status: JobStatus.PENDING,
      request: this.toRequest(dto),
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.jobId, job);
    setImmediate(() => this.process(job, graph));
    return job;
  }

  getStatus(jobId: string): RouteStatusResponseDto {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Job '${jobId}' not found`);
    }
    return {
      status: job.status,
      result: job.result,
      error: job.error,
    };
  }

  private process(job: RouteJob, graph: Graph): void {
    job.status = JobStatus.PROCESSING;
    job.updatedAt = new Date();

    const startedAt = Date.now();
    try {
      const { path, totalCost } = this.routingEngine.findRoute(
        graph,
        job.request,
      );
      job.result = {
        graphId: graph.id,
        totalCost,
        path,
        durationMs: Date.now() - startedAt,
      };
      job.status = JobStatus.COMPLETED;
    } catch (error) {
      job.status = JobStatus.FAILED;
      job.error = this.toRouteError(error);
    } finally {
      job.updatedAt = new Date();
    }
  }

  private toRouteError(error: unknown): RouteError {
    if (error instanceof RoutingError) {
      return { code: error.code, message: error.message };
    }
    return {
      code: RouteErrorCode.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  private toRequest(dto: OptimizeRouteDto): RouteRequest {
    return {
      originNodeId: dto.originNodeId,
      destinationNodeId: dto.destinationNodeId,
      waypoints: dto.waypoints ?? [],
      vehicleProfile: {
        type: dto.vehicleProfile.type,
        weight: dto.vehicleProfile.weight,
        hazardous: dto.vehicleProfile.hazardous,
      },
      departureTime: dto.departureTime,
    };
  }
}
