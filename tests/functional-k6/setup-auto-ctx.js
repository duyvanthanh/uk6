import { createEndpoint, createScenario, createStep, flow, setups } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const setupApi = createEndpoint({ baseUrl, path: "/setup-auto", method: "GET", name: "setup-auto" });

const echoApi = createEndpoint({

  baseUrl,

  path: "/echo",

  method: "POST",

  name: "echo",

  defaultHeaders: () => ({ "Content-Type": "application/json" }),

});



const setupStep = createStep({

  name: "setup auto ctx",

  endpoint: () => setupApi({ timeout: 2000 }),

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export const { setup, runScenario, teardown } = createScenario({

  flowName: "FT Setup Auto Ctx",

  plan: [

    setups([setupStep]),

    flow([

      createStep({

        name: "use setup auto ctx",

        endpoint: (ctx) =>

          echoApi({

            timeout: 2000,

            body: { token: ctx["setup auto ctx"]?.result?.token || "missing" },

          }),

        postprocessor: (res) => {

          const parsed = JSON.parse(res.body);

          console.log(`FT_SETUP_AUTO_CTX_OK token=${parsed.parsed.token}`);

        },

      }),

    ]),

  ],

});

