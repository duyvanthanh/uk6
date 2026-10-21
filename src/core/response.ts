export function parseJsonSafe<T = any>(body: string): T | null {

  try {

    return JSON.parse(body) as T;

  } catch {

    return null;

  }

}



export function pickFirst(data: any, paths: string[] = []): any {

  for (const path of paths) {

    const parts = path.split(".");

    let current = data;

    let found = true;



    for (const part of parts) {

      if (current && Object.prototype.hasOwnProperty.call(current, part)) {

        current = current[part];

      } else {

        found = false;

        break;

      }

    }



    if (found && current !== undefined && current !== null) {

      return current;

    }

  }



  return null;

}

