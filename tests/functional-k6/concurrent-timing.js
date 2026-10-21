import { assertStatus, concurrent, createEndpoint, createScenario, createStep } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const apiA = createEndpoint({ baseUrl, path: "/delay-500?a=1", method: "GET", name: "delay-a" });

const apiB = createEndpoint({ baseUrl, path: "/delay-500?b=1", method: "GET", name: "delay-b" });



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export const { setup, runScenario, teardown } = createScenario({

  flowName: "FT Concurrent Timing",

  plan: [

    concurrent([

      createStep({ name: "delay-a", endpoint: () => apiA({ timeout: 3000 }), checks: [assertStatus(200)] }),

      createStep({

        name: "delay-b",

        endpoint: () => apiB({ timeout: 3000 }),

        checks: [assertStatus(200)],

        postprocessor: () => console.log("FT_CONCURRENT_TIMING_OK"),

      }),

    ]),

  ],

});

