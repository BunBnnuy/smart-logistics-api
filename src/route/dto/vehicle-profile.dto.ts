import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class VehicleProfileDto {
  @ApiProperty({ example: 'truck', description: 'Vehicle type label.' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 4000, description: 'Total vehicle weight.' })
  @IsNumber()
  @Min(0)
  weight!: number;

  @ApiProperty({
    example: false,
    description: 'Whether the vehicle carries hazardous material.',
  })
  @IsBoolean()
  hazardous!: boolean;
}
