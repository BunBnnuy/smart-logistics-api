import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';

/** Non-empty and without leading/trailing whitespace (internal spaces allowed). */
const NODE_ID_PATTERN = /^\S(?:.*\S)?$/;

export class EdgeDto {
  @ApiProperty({ example: 'A', description: 'Source node identifier.' })
  @IsString()
  @Matches(NODE_ID_PATTERN, {
    message:
      'from must be a non-empty value without leading or trailing whitespace',
  })
  from!: string;

  @ApiProperty({ example: 'B', description: 'Target node identifier.' })
  @IsString()
  @Matches(NODE_ID_PATTERN, {
    message:
      'to must be a non-empty value without leading or trailing whitespace',
  })
  to!: string;

  @ApiProperty({
    example: 10,
    description: 'Base traversal cost of the edge.',
  })
  @IsNumber()
  @Min(0)
  cost!: number;

  @ApiPropertyOptional({
    example: 10000,
    description:
      'Maximum vehicle weight allowed on the edge. Omit for no limit.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxWeight?: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'When true, vehicles carrying hazardous material cannot use the edge.',
  })
  @IsOptional()
  @IsBoolean()
  noHazardous?: boolean;

  @ApiPropertyOptional({
    example: 1.5,
    default: 1,
    description: 'Cost multiplier applied during peak hours. Must be > 0.',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  trafficMultiplier?: number;
}
