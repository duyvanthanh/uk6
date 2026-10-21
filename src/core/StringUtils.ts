function generateFallbackUuid(): string {

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {

    const random = Math.floor(Math.random() * 16);

    const value = char === "x" ? random : (random & 0x3) | 0x8;

    return value.toString(16);

  });

}



export class StringUtils {

  static generateClientMessageId(): string {

    return (globalThis as any).crypto?.randomUUID?.() ?? generateFallbackUuid();

  }



  static generateTransactionId(length = 12): string {

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let result = "";



    for (let index = 0; index < length; index += 1) {

      result += chars.charAt(Math.floor(Math.random() * chars.length));

    }



    return result;

  }



  static generateRefNo(prefix = "AUTO"): string {

    return `${prefix}-${Date.now()}-${this.generateTransactionId(8)}`;

  }

}

