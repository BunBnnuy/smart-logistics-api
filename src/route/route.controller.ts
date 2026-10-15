import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OptimizeRouteDto } from './dto/optimize-route.dto';
import {
  RouteAcceptedResponseDto,
  RouteStatusResponseDto,
} from './dto/route-response.dto';
import { RouteService } from './route.service';

@ApiTags('route')
@Controller('route')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post('optimize/:id')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Submit an asynchronous route optimization job',
    description:
      'Returns immediately with a job id. Poll GET /route/status/{jobId} for the result.',
  })
  @ApiAcceptedResponse({ type: RouteAcceptedResponseDto })
  async optimize(
    @Param('id') id: string,
    @Body() dto: OptimizeRouteDto,
  ): Promise<RouteAcceptedResponseDto> {
    const job = await this.routeService.enqueue(id, dto);
    return { jobId: job.jobId };
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Poll the status of a route optimization job' })
  @ApiOkResponse({ type: RouteStatusResponseDto })
  status(@Param('jobId') jobId: string): RouteStatusResponseDto {
    return this.routeService.getStatus(jobId);
  }
}
