import { assertStatus, createDbStep, createEndpoint, createScenario, createSqlQuery, flow } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) {

  throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");

}



const db = {

  query: (_q, ..._params) => [{ OK: 1 }],

  exec: (_q, ..._params) => ({ rowsAffected: 1 }),

};



const selectOne = createSqlQuery({

  db,

  name: "FT sql mockdb load=0",

  query: "SELECT 1 AS OK",

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

    name: "db step with load=0 (mockdb, must stop flow)",

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

  flowName: "FT SQL mockdb load=0 stops flow",

  plan: [flow(steps)],

});



