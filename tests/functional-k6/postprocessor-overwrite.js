import { createEndpoint, createScenario, createStep, flow } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const dataApi = createEndpoint({ baseUrl, path: "/data", method: "GET", name: "data" });

const echoApi = createEndpoint({

  baseUrl,

  path: "/echo",

  method: "POST",

  name: "echo",

  defaultHeaders: () => ({ "Content-Type": "application/json" }),

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export const { setup, runScenario, teardown } = createScenario({

  flowName: "FT Postprocessor Overwrite",

  plan: [

    flow([

      createStep({

        name: "extract-id",

        endpoint: () => dataApi({ timeout: 2000 }),

        extractors: { id: "data.id" },

      }),

      createStep({

        name: "overwrite-id",

        endpoint: () => echoApi({ timeout: 2000, body: { noop: true } }),

        postprocessor: (ctx) => {

          ctx.id = "B";

        },

      }),

      createStep({

        name: "use-id",

        endpoint: (ctx) => echoApi({ timeout: 2000, body: { id: ctx.id } }),

        postprocessor: (res) => {

          const parsed = JSON.parse(res.body);

          console.log(`FT_POST_OVERWRITE_OK id=${parsed.parsed.id}`);

        },

      }),

    ]),

  ],

});

