import { Flow, createEndpoint, createStep } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const api = createEndpoint({

  baseUrl,

  path: "/merge",

  method: "POST",

  name: "shallow-merge",

  defaultHeaders: () => ({ "Content-Type": "application/json", "X-Base": "base" }),

  defaultParams: () => ({ page: 1, mode: "base" }),

  baseTags: { tagBase: "yes" },

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export function runScenario() {

  const flow = new Flow("FT Shallow Merge", { continueOnFailure: false, delayBetweenSteps: 0 });

  flow.addStep(

    createStep({

      name: "call",

      endpoint: api,

      preprocessor: () => ({

        headers: { "X-Base": "override", "X-Extra": "yes" },

        params: { mode: "override", q: "hello world" },

        tags: { tagExtra: "ok" },

        body: { ok: true },

        timeout: 2000,

      }),

      postprocessor: (res) => {

        const parsed = JSON.parse(res.body);

        console.log(`FT_SHALLOW_MERGE_OK url=${parsed.url} base=${parsed.headers["x-base"]} extra=${parsed.headers["x-extra"]}`);

      },

    }),

  );

  flow.execute({});

}

