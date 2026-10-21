import sql from "k6/x/sql";

import oracle from "k6/x/sql/driver/oracle";



import {

  assertStatus,

  createDbStep,

  createEndpoint,

  createOracleDsn,

  createScenario,

  createSqlQuery,

  flow,

} from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) {

  throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");

}



const dsn = __ENV.FT_ORACLE_DSN;

if (!dsn) {

  throw new Error("Missing __ENV.FT_ORACLE_DSN for SQL functional k6 test");

}



const db = sql.open(oracle, dsn);



const selectOne = createSqlQuery({

  db,

  name: "FT sql load=0",

  query: "SELECT 1 AS OK FROM dual",

  timeout: "10s",

});



const ping = createEndpoint({

  baseUrl,

  path: "/api1",

  method: "POST",

  name: "FT http after db",

  defaultHeaders: () => ({ "Content-Type": "application/json" }),

});



export const options = {

  scenarios: {

    main: {

      executor: "shared-iterations",

      vus: 1,

      iterations: 1,

      exec: "runScenario",

      gracefulStop: "0s",

    },

  },

};



const steps = [

  createDbStep({

    name: "db step with load=0 (must stop flow)",

    query: selectOne,

    load: 0,

    checks: [assertStatus(0)],

    postprocessor: () => console.log("FT_DB_SHOULD_NOT_RUN"),

  }),

  {

    name: "http step after db (must not run)",

    endpoint: ping,

    preprocessor: () => ping({ timeout: 2000, body: { ok: true } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log("FT_HTTP_SHOULD_NOT_RUN"),

  },

];



export const { runScenario } = createScenario({

  flowName: "FT SQL load=0 stops flow",

  plan: [flow(steps)],

});



