import { Flow } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const flow = new Flow("FT Probabilistic Load", { continueOnFailure: false, delayBetweenSteps: 0 });

flow.addStep({

  name: "probabilistic",

  endpoint: {

    method: "GET",

    getUrl: () => `${baseUrl}/api1`,

    getRequestConfig: () => ({ timeout: 1000, tags: { name: "probabilistic" }, headers: {} }),

    params: {},

  },

  load: 0.5,

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 30, exec: "default", gracefulStop: "0s" },

  },

};



export default function () {

  flow.execute({});

}

