import { Module } from '@nestjs/common';
import { NetworkModule } from '../network/network.module';
import { RouteController } from './route.controller';
import { RouteService } from './route.service';
import { RoutingEngine } from './routing/routing.engine';

@Module({
  imports: [NetworkModule],
  controllers: [RouteController],
  providers: [RouteService, RoutingEngine],
})
export class RouteModule {}
