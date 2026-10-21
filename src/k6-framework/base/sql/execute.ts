import type { NormalizedSqlInput } from "./normalize.js";



export function executeSql({ db, select, timeout, query, params }: NormalizedSqlInput) {

  if (select) {

    return timeout && typeof db.queryWithTimeout === "function"

      ? db.queryWithTimeout(timeout, query, ...params)

      : db.query(query, ...params);

  }



  return timeout && typeof db.execWithTimeout === "function" ? db.execWithTimeout(timeout, query, ...params) : db.exec(query, ...params);

}



