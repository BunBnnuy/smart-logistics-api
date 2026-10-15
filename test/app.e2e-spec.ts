import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';

interface UploadResponse {
  id: string;
}

interface AcceptedResponse {
  jobId: string;
}

interface StatusResponse {
  status: string;
  result?: {
    graphId: string;
    totalCost: number;
    path: string[];
    durationMs: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

const README_GRAPH = {
  edges: [
    {
      from: 'A',
      to: 'B',
      cost: 10,
      maxWeight: 10000,
      noHazardous: false,
      trafficMultiplier: 1,
    },
    {
      from: 'A',
      to: 'C',
      cost: 15,
      maxWeight: 5000,
      noHazardous: true,
      trafficMultiplier: 1.5,
    },
    {
      from: 'B',
      to: 'D',
      cost: 12,
      maxWeight: 10000,
      noHazardous: false,
      trafficMultiplier: 2,
    },
    {
      from: 'C',
      to: 'D',
      cost: 5,
      maxWeight: 5000,
      noHazardous: true,
      trafficMultiplier: 1,
    },
    {
      from: 'D',
      to: 'E',
      cost: 10,
      maxWeight: 8000,
      noHazardous: false,
      trafficMultiplier: 1.2,
    },
  ],
};

describe('Smart Logistics API (e2e)', () => {
  let app: INestApplication;
  let document: OpenAPIObject;

  const server = (): Server => app.getHttpServer() as Server;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const config = new DocumentBuilder()
      .setTitle('Smart Logistics Routing API')
      .setVersion('1.0')
      .build();
    document = SwaggerModule.createDocument(app, config);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function uploadGraph(payload = README_GRAPH): Promise<string> {
    const res = await request(server()).post('/network/upload').send(payload);
    expect(res.status).toBe(201);
    return (res.body as UploadResponse).id;
  }

  async function optimize(graphId: string, body: unknown) {
    return request(server()).post(`/route/optimize/${graphId}`).send(body);
  }

  async function settle(jobId: string): Promise<StatusResponse> {
    for (let attempt = 0; attempt < 50; attempt++) {
      const res = await request(server()).get(`/route/status/${jobId}`);
      expect(res.status).toBe(200);
      const status = res.body as StatusResponse;
      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Job ${jobId} did not settle in time`);
  }

  describe('network management', () => {
    it('uploads a graph and returns its id (201)', async () => {
      const id = await uploadGraph();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('lists the nodes derived from the uploaded edges', async () => {
      const id = await uploadGraph();
      const res = await request(server()).get(`/network/nodes/${id}`);

      expect(res.status).toBe(200);
      expect(new Set(res.body as string[])).toEqual(
        new Set(['A', 'B', 'C', 'D', 'E']),
      );
    });

    it('rejects a malformed upload (400)', async () => {
      const res = await request(server())
        .post('/network/upload')
        .send({ edges: [] });

      expect(res.status).toBe(400);
    });

    it('rejects self-loops (400)', async () => {
      const res = await request(server())
        .post('/network/upload')
        .send({ edges: [{ from: 'A', to: 'A', cost: 1 }] });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('self-loop');
    });

    it('rejects duplicated edges (400)', async () => {
      const res = await request(server())
        .post('/network/upload')
        .send({
          edges: [
            { from: 'A', to: 'B', cost: 10 },
            { from: 'A', to: 'B', cost: 10 },
          ],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('duplicated edge');
    });

    it('rejects parallel edges with different costs (400)', async () => {
      const res = await request(server())
        .post('/network/upload')
        .send({
          edges: [
            { from: 'A', to: 'B', cost: 10 },
            { from: 'A', to: 'B', cost: 5 },
          ],
        });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('parallel edges');
    });

    it('accepts bidirectional edges (201)', async () => {
      const res = await request(server())
        .post('/network/upload')
        .send({
          edges: [
            { from: 'A', to: 'B', cost: 10 },
            { from: 'B', to: 'A', cost: 10 },
          ],
        });

      expect(res.status).toBe(201);
    });

    it('rejects blank node ids (400)', async () => {
      const res = await request(server())
        .post('/network/upload')
        .send({ edges: [{ from: ' ', to: 'B', cost: 1 }] });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('whitespace');
    });

    it('returns 404 for an unknown network', async () => {
      const res = await request(server()).get('/network/nodes/does-not-exist');
      expect(res.status).toBe(404);
    });
  });

  describe('route optimization (asynchronous)', () => {
    it('accepts a job immediately with 202 and a jobId', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });

      expect(res.status).toBe(202);
      expect((res.body as AcceptedResponse).jobId).toMatch(/^job-/);
    });

    it('computes the standard path (Test Case 1)', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });

      const status = await settle((res.body as AcceptedResponse).jobId);

      expect(status.status).toBe('COMPLETED');
      expect(status.result?.path).toEqual(['A', 'C', 'D', 'E']);
      expect(status.result?.totalCost).toBe(30);
      expect(status.result?.graphId).toBe(id);
      expect(typeof status.result?.durationMs).toBe('number');
    });

    it('applies the weight constraint (Test Case 2)', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'truck', weight: 6000, hazardous: false },
        departureTime: '12:00',
      });

      const status = await settle((res.body as AcceptedResponse).jobId);

      expect(status.result?.path).toEqual(['A', 'B', 'D', 'E']);
      expect(status.result?.totalCost).toBe(32);
    });

    it('reports a failed job for invalid nodes without breaking the request', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'Z',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });

      expect(res.status).toBe(202);
      const status = await settle((res.body as AcceptedResponse).jobId);

      expect(status.status).toBe('FAILED');
      expect(status.error?.code).toBe('UNKNOWN_NODE');
      expect(status.error?.message).toContain('Z');
      expect(status.result).toBeUndefined();
    });

    it('reports NO_ROUTE when no edge can carry the vehicle', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'truck', weight: 12000, hazardous: false },
        departureTime: '12:00',
      });

      const status = await settle((res.body as AcceptedResponse).jobId);

      expect(status.status).toBe('FAILED');
      expect(status.error?.code).toBe('NO_ROUTE');
      expect(status.error?.message).toContain('No route');
      expect(status.result).toBeUndefined();
    });

    it('rejects an invalid request body (400)', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, { originNodeId: 'A' });

      expect(res.status).toBe(400);
    });

    it('rejects origin equal to destination without waypoints (400)', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'A',
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '12:00',
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('must differ');
    });

    it('rejects duplicated waypoints (400)', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        waypoints: ['C', 'C'],
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '12:00',
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('duplicated waypoint');
    });

    it('rejects a waypoint equal to the origin (400)', async () => {
      const id = await uploadGraph();
      const res = await optimize(id, {
        originNodeId: 'A',
        destinationNodeId: 'E',
        waypoints: ['A'],
        vehicleProfile: { type: 'van', weight: 1000, hazardous: false },
        departureTime: '12:00',
      });

      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain('must not equal the origin');
    });

    it('returns 404 when optimizing against an unknown network', async () => {
      const res = await optimize('does-not-exist', {
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });

      expect(res.status).toBe(404);
    });

    it('returns 404 for an unknown job id', async () => {
      const res = await request(server()).get('/route/status/unknown-job');
      expect(res.status).toBe(404);
    });
  });

  describe('OpenAPI document', () => {
    it('auto-generates every endpoint from the code', () => {
      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining([
          '/network/upload',
          '/network/nodes/{id}',
          '/route/optimize/{id}',
          '/route/status/{jobId}',
        ]),
      );
    });

    it('documents the request schemas', () => {
      expect(Object.keys(document.components?.schemas ?? {})).toEqual(
        expect.arrayContaining([
          'UploadNetworkDto',
          'EdgeDto',
          'OptimizeRouteDto',
          'VehicleProfileDto',
        ]),
      );
    });
  });
});
