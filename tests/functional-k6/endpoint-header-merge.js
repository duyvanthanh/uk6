import { Flow, createEndpoint, createStep } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const api = createEndpoint({

  baseUrl,

  path: "/merge",

  method: "POST",

  name: "header-merge",

  defaultHeaders: () => ({

    "Content-Type": "application/json",

    "X-Base": "base",

    "X-Same": "old",

  }),

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export function runScenario() {

  const flow = new Flow("FT Header Merge", { continueOnFailure: false, delayBetweenSteps: 0 });

  flow.addStep(

    createStep({

      name: "call",

      endpoint: api,

      preprocessor: () => ({

        headers: { "X-Same": "new", "X-New": "added" },

        body: { ok: true },

        timeout: 2000,

      }),

      postprocessor: (res) => {

        const parsed = JSON.parse(res.body);

        console.log(`FT_HEADER_MERGE_OK same=${parsed.headers["x-same"]} base=${parsed.headers["x-base"]} new=${parsed.headers["x-new"]}`);

      },

    }),

  );

  flow.execute({});

}

