import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

interface RouteRequestShape {
  originNodeId?: unknown;
  destinationNodeId?: unknown;
  waypoints?: unknown;
}

/**
 * Cross-field validation of a route request:
 * - `waypoints` must not contain duplicates;
 * - `waypoints` must not include the origin or the destination;
 * - origin and destination must differ when no waypoints are given
 *   (a zero-length trip is rejected; with waypoints a round trip is allowed).
 */
@ValidatorConstraint({ name: 'validRouteRequest', async: false })
export class ValidRouteRequestConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    return this.collectErrors(args.object).length === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.collectErrors(args.object).join('; ');
  }

  private collectErrors(object: unknown): string[] {
    const dto = object as RouteRequestShape;
    const origin = dto.originNodeId;
    const destination = dto.destinationNodeId;
    const waypoints = Array.isArray(dto.waypoints)
      ? (dto.waypoints as string[])
      : [];

    const errors: string[] = [];

    const seen = new Set<string>();
    for (const waypoint of waypoints) {
      if (seen.has(waypoint)) {
        errors.push(`duplicated waypoint '${waypoint}'`);
      }
      seen.add(waypoint);
    }

    if (typeof origin === 'string' && waypoints.includes(origin)) {
      errors.push(`waypoint '${origin}' must not equal the origin`);
    }
    if (typeof destination === 'string' && waypoints.includes(destination)) {
      errors.push(`waypoint '${destination}' must not equal the destination`);
    }

    if (
      waypoints.length === 0 &&
      typeof origin === 'string' &&
      typeof destination === 'string' &&
      origin === destination
    ) {
      errors.push(
        'origin and destination must differ when no waypoints are given',
      );
    }

    return errors;
  }
}

export function IsValidRouteRequest(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: ValidRouteRequestConstraint,
    });
  };
}
