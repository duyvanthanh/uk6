import { Flow, createEndpoint, createStep, encodeFormBody } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const api = createEndpoint({

  baseUrl,

  path: "/echo",

  method: "POST",

  name: "form-encoder",

  defaultHeaders: () => ({ "Content-Type": "application/x-www-form-urlencoded" }),

  bodyEncoder: encodeFormBody,

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "runScenario", gracefulStop: "0s" },

  },

};



export function runScenario() {

  const flow = new Flow("FT Form Encoder", { continueOnFailure: false, delayBetweenSteps: 0 });

  flow.addStep(

    createStep({

      name: "call",

      endpoint: () => api({ body: { a: 1, b: "hello world" }, timeout: 2000 }),

      postprocessor: (res) => {

        const parsed = JSON.parse(res.body);

        console.log(`FT_FORM_BODY_OK raw=${parsed.body}`);

      },

    }),

  );

  flow.execute({});

}

