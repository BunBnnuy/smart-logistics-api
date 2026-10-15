import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, RouteErrorCode } from '../interfaces/job.types';

export class RouteAcceptedResponseDto {
  @ApiProperty({
    example: 'job-987',
    description: 'Identifier used to poll the job status.',
  })
  jobId!: string;
}

export class RouteResultDto {
  @ApiProperty({ example: '3f1b0c2e-9a4d-4b7e-8c1f-2d5a6e7b8c9d' })
  graphId!: string;

  @ApiProperty({ example: 25.5 })
  totalCost!: number;

  @ApiProperty({ example: ['A', 'C', 'D', 'E'], type: [String] })
  path!: string[];

  @ApiProperty({ example: 4, description: 'Algorithm execution time in ms.' })
  durationMs!: number;
}

export class RouteErrorDto {
  @ApiProperty({ enum: RouteErrorCode, example: RouteErrorCode.NO_ROUTE })
  code!: RouteErrorCode;

  @ApiProperty({
    example: "No route from 'A' to 'E' under the given constraints",
  })
  message!: string;
}

export class RouteStatusResponseDto {
  @ApiProperty({ enum: JobStatus, example: JobStatus.COMPLETED })
  status!: JobStatus;

  @ApiPropertyOptional({ type: RouteResultDto })
  result?: RouteResultDto;

  @ApiPropertyOptional({ type: RouteErrorDto })
  error?: RouteErrorDto;
}
