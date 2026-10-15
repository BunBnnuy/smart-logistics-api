import { DynamicModule, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InMemoryNetworkRepository } from '../network/in-memory-network.repository';
import { NetworkRepository } from '../network/network.repository';
import { MongoNetworkRepository } from '../network/mongo/mongo-network.repository';
import { NetworkEntity, NetworkSchema } from '../network/mongo/network.schema';

/**
 * Selects the persistence driver at boot:
 * - `MONGO_URI` set  -> MongoDB (Mongoose).
 * - otherwise        -> in-memory (keeps the last 5 networks).
 */
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    const uri = process.env.MONGO_URI;

    if (!uri) {
      return {
        module: DatabaseModule,
        providers: [
          { provide: NetworkRepository, useClass: InMemoryNetworkRepository },
        ],
        exports: [NetworkRepository],
      };
    }

    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: NetworkEntity.name, schema: NetworkSchema },
        ]),
      ],
      providers: [
        { provide: NetworkRepository, useClass: MongoNetworkRepository },
      ],
      exports: [NetworkRepository],
    };
  }
}
