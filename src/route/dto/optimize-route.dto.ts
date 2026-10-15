import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { VehicleProfileDto } from './vehicle-profile.dto';
import { IsValidRouteRequest } from './valid-route-request.validator';

export class OptimizeRouteDto {
  @ApiProperty({ example: 'A', description: 'Starting node.' })
  @IsString()
  @IsNotEmpty()
  @IsValidRouteRequest()
  originNodeId!: string;

  @ApiProperty({ example: 'E', description: 'Ending node.' })
  @IsString()
  @IsNotEmpty()
  destinationNodeId!: string;

  @ApiPropertyOptional({
    example: ['C'],
    type: [String],
    description: 'Intermediate stops, visited in the given order.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  waypoints?: string[];

  @ApiProperty({ type: VehicleProfileDto })
  @ValidateNested()
  @Type(() => VehicleProfileDto)
  vehicleProfile!: VehicleProfileDto;

  @ApiProperty({
    example: '08:00',
    description: 'Departure time in 24h HH:mm format.',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'departureTime must be a valid time in HH:mm format',
  })
  departureTime!: string;
}
