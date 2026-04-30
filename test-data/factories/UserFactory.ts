import users from '../users.json';

export interface User {
  username: string;
  password: string;
}

export interface CheckoutData {
  firstName: string;
  lastName: string;
  postalCode: string;
}

export class UserFactory {
  private user: User;
  private checkoutData: CheckoutData;

  constructor() {
    this.user = { ...users.validUsers[0] };
    this.checkoutData = { ...users.checkoutUsers[0] };
  }

  static aStandardUser(): UserFactory {
    return new UserFactory();
  }

  withUsername(username: string): UserFactory {
    this.user.username = username;
    return this;
  }

  withPassword(password: string): UserFactory {
    this.user.password = password;
    return this;
  }

  buildUser(): User {
    return { ...this.user };
  }

  buildCheckoutData(): CheckoutData {
    return { ...this.checkoutData };
  }

  // Checkout data builder methods
  withFirstName(firstName: string): UserFactory {
    this.checkoutData.firstName = firstName;
    return this;
  }

  withLastName(lastName: string): UserFactory {
    this.checkoutData.lastName = lastName;
    return this;
  }

  withPostalCode(postalCode: string): UserFactory {
    this.checkoutData.postalCode = postalCode;
    return this;
  }
}
