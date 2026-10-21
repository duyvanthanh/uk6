import { createEndpoint, createScenario, createStep, setups, flow, concurrent, teardowns } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const api = createEndpoint({

  baseUrl,

  path: "/echo",

  method: "POST",

  name: "reused",

  defaultHeaders: () => ({ "Content-Type": "application/json" }),

});



const reusedStep = createStep({

  name: "reused-step",

  endpoint: api,

  preprocessor: () => ({

    body: { reused: true },

    timeout: 2000,

  }),

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export const { setup, runScenario, teardown } = createScenario({

  flowName: "FT Step Reuse",

  plan: [setups([reusedStep]), flow([reusedStep]), concurrent([reusedStep]), teardowns([reusedStep])],

});

