import { StringUtils } from "./StringUtils.js";



export interface UniqueDataOptions {

  prefix?: string;

  runId?: string | number;

  vu?: string | number;

  iteration?: string | number;

  timestamp?: number;

}



export class DataUtils {

  static randomDigits(length: number): string {

    if (!Number.isFinite(length) || length <= 0) return "";

    let out = "";

    for (let i = 0; i < length; i += 1) {

      out += Math.floor(Math.random() * 10).toString(10);

    }

    return out;

  }



  static randomString(length = 10): string {

    return StringUtils.generateTransactionId(length);

  }



  static randomNumber(min = 1, max = 100): number {

    return Math.floor(Math.random() * (max - min + 1)) + min;

  }



  static randomFromArray<T>(items: T[]): T {

    if (items.length === 0) {

      throw new Error("randomFromArray requires at least one item.");

    }

    return items[Math.floor(Math.random() * items.length)];

  }



  static uniqueId(options: UniqueDataOptions = {}): string {

    const prefix = options.prefix ?? "AUTO";

    const parts = [

      prefix,

      options.runId,

      options.vu != null ? `vu${options.vu}` : undefined,

      options.iteration != null ? `iter${options.iteration}` : undefined,

      options.timestamp ?? Date.now(),

      StringUtils.generateTransactionId(6),

    ].filter((part) => part !== undefined && part !== "");



    return parts.join("-");

  }



  static buildFormBody(body: Record<string, string | number | boolean>): string {

    return Object.entries(body)

      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

      .join("&");

  }



}
