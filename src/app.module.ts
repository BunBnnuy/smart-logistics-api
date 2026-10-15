import { Module } from '@nestjs/common';
import { NetworkModule } from './network/network.module';
import { RouteModule } from './route/route.module';

@Module({
  imports: [NetworkModule, RouteModule],
})
export class AppModule {}
