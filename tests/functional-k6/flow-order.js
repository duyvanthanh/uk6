import { createEndpoint, createScenario, createStep, flow } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const mk = (path, name) =>

  createEndpoint({

    baseUrl,

    path,

    method: "POST",

    name,

    defaultHeaders: () => ({ "Content-Type": "application/json" }),

  });



const step1Api = mk("/echo?step=1", "step1");

const step2Api = mk("/echo?step=2", "step2");

const step3Api = mk("/echo?step=3", "step3");



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export const { setup, runScenario, teardown } = createScenario({

  flowName: "FT Flow Order",

  plan: [

    flow([

      createStep({ name: "step-1", endpoint: () => step1Api({ body: { step: 1 }, timeout: 2000 }) }),

      createStep({ name: "step-2", endpoint: () => step2Api({ body: { step: 2 }, timeout: 2000 }) }),

      createStep({

        name: "step-3",

        endpoint: () => step3Api({ body: { step: 3 }, timeout: 2000 }),

        postprocessor: () => console.log("FT_FLOW_ORDER_OK"),

      }),

    ]),

  ],

});

