import { Flow, assertResponseTime } from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



function endpoint(path) {

  return {

    method: "GET",

    getUrl: () => `${baseUrl}${path}`,

    getRequestConfig: () => ({ timeout: 7000, tags: { name: path }, headers: {} }),

    params: {},

  };

}



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 1, exec: "default", gracefulStop: "0s" },

  },

};



export default function () {

  const flow = new Flow("FT Assert Response Time", { continueOnFailure: true, delayBetweenSteps: 0 });

  const checks = [

    ["sub100", "/delay-050", 100],

    ["sub1000", "/delay-500", 1000],

    ["over100", "/delay-500", 100],

    ["over500", "/delay-1000", 500],

    ["over1000", "/slow5000", 1000],

  ];



  checks.forEach(([label, path, maxMs]) => {

    const check = assertResponseTime(maxMs);

    flow.addStep({

      name: `${label}-${path}`,

      endpoint: endpoint(path),

      postprocessor: (res) => {

        console.log(`FT_RT_${label.toUpperCase()}=${check.condition(res)}`);

      },

    });

  });



  flow.execute({});

}

