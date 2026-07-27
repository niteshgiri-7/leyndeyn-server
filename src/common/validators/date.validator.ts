import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "isNotInFuture", async: false })
export class IsNotInFutureConstraint implements ValidatorConstraintInterface {
  validate(dateString: string) {
    if (!dateString) return true;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    return date <= new Date();
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} cannot be in the future`;
  }
}

@ValidatorConstraint({ name: "isBeforeOrSame", async: false })
export class IsBeforeOrSameConstraint implements ValidatorConstraintInterface {
  validate(startDateStr: string, args: ValidationArguments) {
    const target = args.object as Record<string, string>;
    const endDateStr = target[args.constraints[0] as string];
    if (!startDateStr || !endDateStr) return true;

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return true;

    return startDate <= endDate;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be before or the same as ${args.constraints[0] as string}`;
  }
}
