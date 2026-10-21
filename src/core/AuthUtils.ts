import { encodeBase64 } from "./encoding.js";

export class AuthUtils {
  static createBasicAuth(userName: string, password: string): string {
    return encodeBase64(`${userName}:${password}`);
  }
}
