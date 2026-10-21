import { createEndpoint, createScenario, createStep, flow } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const loginApi = createEndpoint({

  baseUrl,

  path: "/login",

  method: "POST",

  name: "login",

  defaultHeaders: () => ({ "Content-Type": "application/json" }),

  defaultBody: () => ({ username: "u", password: "p" }),

});



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

  flowName: "FT Preprocessor Ctx",

  plan: [

    flow([

      createStep({

        name: "login",

        endpoint: () => loginApi({ timeout: 2000 }),

        extractors: { sessionId: "sessionId" },

      }),

      createStep({

        name: "existing-key",

        endpoint: echoApi,

        preprocessor: (ctx) => ({

          headers: { Authorization: `Bearer ${ctx.sessionId}` },

          body: { sessionId: ctx.sessionId },

          timeout: 2000,

        }),

      }),

      createStep({

        name: "missing-key",

        endpoint: echoApi,

        preprocessor: (ctx) => ({

          body: { fallback: ctx.missingKey || "MISSING" },

          timeout: 2000,

        }),

        postprocessor: () => console.log("FT_PREPROCESSOR_CTX_OK"),

      }),

    ]),

  ],

});

