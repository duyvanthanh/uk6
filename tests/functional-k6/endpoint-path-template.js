import { Flow, assertStatus, createEndpoint, createStep } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const presigned = createEndpoint({

  baseUrl,

  path: "/files/download/{id}",

  method: "GET",

  name: "FT presigned",

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export function runScenario() {

  const flow = new Flow("FT Endpoint Path Template", { continueOnFailure: false, delayBetweenSteps: 0 });



const step = createStep({

    name: "call",

    endpoint: presigned,

    preprocessor: () =>

      presigned({

        timeout: 2000,

        pathParams: { id: "abc 123" },

      }),

    checks: [assertStatus(200)],

  });



  flow.addStep(step);

  flow.execute({});

}

