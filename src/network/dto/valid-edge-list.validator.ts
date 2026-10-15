import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { EdgeDto } from './edge.dto';

/**
 * Validates the edge list of an uploaded network:
 * - rejects self-loops (`from === to`);
 * - rejects duplicated edges (same direction, same cost);
 * - rejects parallel edges (same direction, different cost).
 *
 * Bidirectional pairs are VALID: `A -> B` and `B -> A` are distinct edges of a
 * directed graph, so they are never treated as duplicates. This is intentional
 * (the graph is directed) and must stay that way.
 */
@ValidatorConstraint({ name: 'validEdgeList', async: false })
export class ValidEdgeListConstraint implements ValidatorConstraintInterface {
  validate(edges: unknown): boolean {
    return this.collectErrors(edges).length === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    return this.collectErrors(args.value).join('; ');
  }

  private collectErrors(edges: unknown): string[] {
    if (!Array.isArray(edges)) {
      return [];
    }

    const errors: string[] = [];
    const seen = new Map<string, EdgeDto>();

    edges.forEach((edge: EdgeDto, index: number) => {
      if (edge.from === edge.to) {
        errors.push(
          `edge #${index} is a self-loop ('${edge.from}' -> '${edge.to}')`,
        );
        return;
      }

      const key = `${edge.from} -> ${edge.to}`;
      const previous = seen.get(key);
      if (previous === undefined) {
        seen.set(key, edge);
        return;
      }

      // Same direction already defined. Note that the reverse direction
      // (B -> A) has a different key and is therefore allowed.
      if (previous.cost === edge.cost) {
        errors.push(`duplicated edge '${key}'`);
      } else {
        errors.push(
          `parallel edges '${key}' with different costs (${previous.cost} and ${edge.cost})`,
        );
      }
    });

    return errors;
  }
}

export function IsValidEdgeList(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: ValidEdgeListConstraint,
    });
  };
}
