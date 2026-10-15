import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { GraphEdge } from '../../common/types/graph.types';

@Schema({ _id: false })
export class EdgeEntity {
  @Prop({ required: true, type: String })
  from!: string;

  @Prop({ required: true, type: String })
  to!: string;

  @Prop({ required: true, type: Number })
  cost!: number;

  @Prop({ type: Number, default: Number.POSITIVE_INFINITY })
  maxWeight!: number;

  @Prop({ type: Boolean, default: false })
  noHazardous!: boolean;

  @Prop({ type: Number, default: 1 })
  trafficMultiplier!: number;
}

export const EdgeSchema = SchemaFactory.createForClass(EdgeEntity);

@Schema({ collection: 'networks', versionKey: false })
export class NetworkEntity {
  @Prop({ required: true, type: String })
  _id!: string;

  @Prop({ type: [EdgeSchema], default: [] })
  edges!: GraphEdge[];

  @Prop({ type: [String], default: [] })
  nodes!: string[];

  @Prop({ type: Date, default: () => new Date() })
  createdAt!: Date;
}

export const NetworkSchema = SchemaFactory.createForClass(NetworkEntity);

export type NetworkDocument = HydratedDocument<NetworkEntity>;
