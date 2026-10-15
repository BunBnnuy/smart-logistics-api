import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { NetworkController } from './network.controller';
import { NetworkService } from './network.service';

@Module({
  imports: [DatabaseModule.forRoot()],
  controllers: [NetworkController],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {}
