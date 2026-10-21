import sql from "k6/x/sql";

import oracle from "k6/x/sql/driver/oracle";



import {

  assertStatus,

  createEndpoint,

  createScenario,

  createDbStep,

  createSql,

  extractValues,

  flow,

  setups,

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



const selectId = createSql({

  db,

  name: "FT sql select id",

  query: "SELECT 'abc123' AS ID FROM dual",

  timeout: "10s",

});



const useId = createEndpoint({

  baseUrl,

  path: "/use-id",

  method: "POST",

  name: "FT use id",

  defaultHeaders: () => ({ "Content-Type": "application/json" }),

});



const setupTasks = [

  createDbStep({

    name: "setup sql select",

    query: selectId,

    checks: [assertStatus(0)],

    extractors: extractValues({ id: ["rows.0.ID", "rows.0.id"] }),

    postprocessor: () => console.log("FT_SQL_OK"),

  }),

];



const steps = [

  createDbStep({

    name: "use extracted id",

    endpoint: useId,

    preprocessor: (ctx) => useId({ timeout: 2000, body: { id: ctx.id } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log("FT_SQL_HTTP_OK"),

  }),

];



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



export const { setup, runScenario } = createScenario({

  flowName: "FT SQL Oracle Step",

  plan: [setups(setupTasks), flow(steps, "ft-sql-flow")],

});

