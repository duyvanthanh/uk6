import { Flow, assertStatus, createEndpoint, createStep } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const downloadApi = createEndpoint({

  baseUrl,

  path: "/download",

  method: "GET",

  name: "FT download",

  // hành vi: không log body cho API binary

  logResponseBody: false,

  responseType: "binary",

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export function runScenario() {

  const flow = new Flow("FT No Log Body", { continueOnFailure: false, delayBetweenSteps: 0 });



  flow.addStep(

    createStep({

      name: "download",

      endpoint: downloadApi,

      preprocessor: () => downloadApi({ timeout: 2000 }),

      checks: [assertStatus(200)],

    }),

  );



  flow.execute({});

}



