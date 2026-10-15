import 'reflect-metadata';
import assert from 'node:assert/strict';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection } from 'mongoose';
import { Db } from 'mongodb';
import { Server } from 'node:http';
import request from 'supertest';
import { Graph } from '../src/common/types/graph.types';
import { MongoNetworkRepository } from '../src/network/mongo/mongo-network.repository';
import {
  NetworkDocument,
  NetworkEntity,
  NetworkSchema,
} from '../src/network/mongo/network.schema';

const GRAPH: Graph = {
  id: 'graph-1',
  edges: [
    {
      from: 'A',
      to: 'B',
      cost: 10,
      maxWeight: Number.POSITIVE_INFINITY,
      noHazardous: false,
      trafficMultiplier: 1,
    },
  ],
  nodes: ['A', 'B'],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

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

async function verifyRepository(uri: string): Promise<void> {
  const connection = await createConnection(uri).asPromise();
  try {
    const model = connection.model<NetworkDocument>(
      NetworkEntity.name,
      NetworkSchema,
    );
    const repository = new MongoNetworkRepository(model);

    await repository.save(GRAPH);
    assert.deepEqual(await repository.findById(GRAPH.id), GRAPH);
    assert.equal(await repository.findById('missing'), null);

    console.log('[1/2] repository round-trip OK (lossless mapping)');
  } finally {
    await connection.close();
  }
}

async function verifyApp(uri: string): Promise<void> {
  const { AppModule } = await import('../src/app.module');

  const app: INestApplication = await NestFactory.create(AppModule, {
    logger: false,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  try {
    const server = app.getHttpServer() as Server;
    const upload = await request(server)
      .post('/network/upload')
      .send(README_GRAPH);
    assert.equal(upload.status, 201);
    const graphId = (upload.body as { id: string }).id;

    const optimize = await request(server)
      .post(`/route/optimize/${graphId}`)
      .send({
        originNodeId: 'A',
        destinationNodeId: 'E',
        vehicleProfile: { type: 'van', weight: 3000, hazardous: false },
        departureTime: '12:00',
      });
    assert.equal(optimize.status, 202);

    let status = '';
    for (let attempt = 0; attempt < 50 && status !== 'COMPLETED'; attempt++) {
      const poll = await request(server).get(
        `/route/status/${(optimize.body as { jobId: string }).jobId}`,
      );
      status = (poll.body as { status: string }).status;
      if (status !== 'COMPLETED') {
        await new Promise((resolve) => setTimeout(resolve, 20));
      } else {
        assert.deepEqual(
          (poll.body as { result: { path: string[] } }).result.path,
          ['A', 'C', 'D', 'E'],
        );
      }
    }
    assert.equal(status, 'COMPLETED');

    const persisted = await createConnection(uri).asPromise();
    try {
      const db = persisted.db as Db;
      const count = await db
        .collection<{ _id: string }>('networks')
        .countDocuments({ _id: graphId });
      assert.equal(count, 1);
    } finally {
      await persisted.close();
    }

    console.log('[2/2] app over MongoDB OK (upload -> optimize -> persisted)');
  } finally {
    await app.close();
  }
}

async function main(): Promise<void> {
  const mongod = await MongoMemoryServer.create({
    binary: { version: '7.0.14' },
  });
  process.env.MONGO_URI = mongod.getUri();

  try {
    await verifyRepository(process.env.MONGO_URI);
    await verifyApp(process.env.MONGO_URI);
    console.log('Mongo verification passed.');
  } finally {
    await mongod.stop();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
