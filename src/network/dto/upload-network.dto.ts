import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { EdgeDto } from './edge.dto';
import { IsValidEdgeList } from './valid-edge-list.validator';

export class UploadNetworkDto {
  @ApiProperty({
    type: [EdgeDto],
    description: 'Edges of the graph. Nodes are derived from their endpoints.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EdgeDto)
  @IsValidEdgeList()
  edges!: EdgeDto[];
}

export class UploadNetworkResponseDto {
  @ApiProperty({
    example: '3f1b0c2e-9a4d-4b7e-8c1f-2d5a6e7b8c9d',
    description: 'Identifier of the stored network.',
  })
  id!: string;
}
