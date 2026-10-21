import {

  assertStatus,

  createDbStep,

  createScenario,

  createSqlQuery,

  extractValues,

  flow,

  setups,

} from "../../dist/esm/src/k6-framework/index.js";



// Pure-JS mock DB for k6/x/sql-like API.

const db = {

  query: (_q, ..._params) => [{ ID: "abc123" }],

  exec: (_q, ..._params) => ({ rowsAffected: 1 }),

  queryWithTimeout: (_timeout, q, ...params) => db.query(q, ...params),

  execWithTimeout: (_timeout, q, ...params) => db.exec(q, ...params),

};



const selectId = createSqlQuery({

  db,

  name: "FT sql mockdb select",

  query: "SELECT 'abc123' AS ID",

  timeout: "10s",

  logRowCount: true,

  logFirstRow: true,

});



const setupTasks = [

  createDbStep({

    name: "setup sql select (mockdb)",

    query: selectId,

    checks: [assertStatus(0)],

    extractors: extractValues({ id: ["rows.0.ID", "rows.0.id"] }),

    postprocessor: () => console.log("FT_SQL_MOCKDB_OK"),

  }),

];



const steps = [

  createDbStep({

    name: "sql select again (mockdb)",

    query: selectId,

    checks: [assertStatus(0)],

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

  flowName: "FT SQL MockDB Step",

  plan: [setups(setupTasks), flow(steps, "ft-sql-mockdb-flow")],

});



