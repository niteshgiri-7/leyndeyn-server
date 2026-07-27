import { ValidationArguments } from "class-validator";
import {
  IsNotInFutureConstraint,
  IsBeforeOrSameConstraint,
} from "./date.validator";

describe("Date Validators", () => {
  describe("IsNotInFutureConstraint", () => {
    let validator: IsNotInFutureConstraint;

    beforeEach(() => {
      validator = new IsNotInFutureConstraint();
    });

    it("should return true if no date is provided", () => {
      expect(validator.validate("")).toBe(true);
    });

    it("should return false if the date is invalid", () => {
      expect(validator.validate("invalid-date")).toBe(false);
    });

    it("should return true if the date is in the past", () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      expect(validator.validate(pastDate.toISOString())).toBe(true);
    });

    it("should return false if the date is in the future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(validator.validate(futureDate.toISOString())).toBe(false);
    });

    it("should have a default error message", () => {
      const args: ValidationArguments = {
        value: "2050-01-01",
        targetName: "TestClass",
        object: {},
        property: "startDate",
        constraints: [],
      };
      expect(validator.defaultMessage(args)).toBe(
        "startDate cannot be in the future",
      );
    });
  });

  describe("IsBeforeOrSameConstraint", () => {
    let validator: IsBeforeOrSameConstraint;

    beforeEach(() => {
      validator = new IsBeforeOrSameConstraint();
    });

    it("should return true if startDate or endDate is missing", () => {
      const args = {
        object: { endDate: "2024-01-01" },
        constraints: ["endDate"],
      } as unknown as ValidationArguments;
      expect(validator.validate("", args)).toBe(true);

      const args2 = {
        object: {},
        constraints: ["endDate"],
      } as unknown as ValidationArguments;
      expect(validator.validate("2024-01-01", args2)).toBe(true);
    });

    it("should return true if dates are invalid", () => {
      const args = {
        object: { endDate: "invalid" },
        constraints: ["endDate"],
      } as unknown as ValidationArguments;
      expect(validator.validate("invalid", args)).toBe(true);
    });

    it("should return true if startDate is before endDate", () => {
      const args = {
        object: { endDate: "2024-02-01" },
        constraints: ["endDate"],
      } as unknown as ValidationArguments;
      expect(validator.validate("2024-01-01", args)).toBe(true);
    });

    it("should return true if startDate is same as endDate", () => {
      const args = {
        object: { endDate: "2024-01-01" },
        constraints: ["endDate"],
      } as unknown as ValidationArguments;
      expect(validator.validate("2024-01-01", args)).toBe(true);
    });

    it("should return false if startDate is after endDate", () => {
      const args = {
        object: { endDate: "2024-01-01" },
        constraints: ["endDate"],
      } as unknown as ValidationArguments;
      expect(validator.validate("2024-02-01", args)).toBe(false);
    });

    it("should have a default error message", () => {
      const args: ValidationArguments = {
        value: "2024-02-01",
        targetName: "TestClass",
        object: {},
        property: "startDate",
        constraints: ["endDate"],
      };
      expect(validator.defaultMessage(args)).toBe(
        "startDate must be before or the same as endDate",
      );
    });
  });
});
