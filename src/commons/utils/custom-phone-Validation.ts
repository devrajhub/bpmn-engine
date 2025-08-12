import {
  isPhoneNumber,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsPhoneNumberValid', async: false })
export class IsPhoneNumberValid implements ValidatorConstraintInterface {
  validate(phoneNumber: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    const isValidPhoneNumber = isPhoneNumber(phoneNumber, relatedValue);
    return isValidPhoneNumber;
  }

  defaultMessage(args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    return `${relatedPropertyName} must be 'someValue' if ${args.property} is 'expectedValue'`;
  }
}
