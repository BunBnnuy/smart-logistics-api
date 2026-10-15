import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  UploadNetworkDto,
  UploadNetworkResponseDto,
} from './dto/upload-network.dto';
import { NetworkService } from './network.service';

@ApiTags('network')
@Controller('network')
export class NetworkController {
  constructor(private readonly networkService: NetworkService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a graph definition',
    description:
      'Stores a new network and returns its id. Nodes are derived from edge endpoints.',
  })
  @ApiCreatedResponse({ type: UploadNetworkResponseDto })
  async upload(
    @Body() dto: UploadNetworkDto,
  ): Promise<UploadNetworkResponseDto> {
    const graph = await this.networkService.create(dto.edges);
    return { id: graph.id };
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'List all nodes of a stored network' })
  @ApiOkResponse({ type: [String] })
  getNodes(@Param('id') id: string): Promise<string[]> {
    return this.networkService.getNodes(id);
  }
}
