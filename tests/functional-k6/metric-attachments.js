import {

  addToMetricCount,

  addToMetricRate,

  assertPath,

  assertStatus,

  concurrent,

  createEndpoint,

  createScenario,

  createStep,

  flow,

} from "../../dist/esm/src/k6-framework/index.js";



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error("Missing __ENV.FT_BASE_URL for functional k6 test");



const bizApi = createEndpoint({

  baseUrl,

  path: "/biz",

  method: "POST",

  name: "FT biz",

});



export const options = {

  scenarios: {

    main: { executor: "shared-iterations", vus: 1, iterations: 10, exec: "runScenario", gracefulStop: "0s" },

  },

  thresholds: {

    // Giữ threshold không fail; xác minh bằng JSON `summary-export` trong test Node. 

    wrong_response_code_rate: ["rate<=1"],

    wrong_response_code_count: ["count>=0"],

    wrong_response_code_allfail_rate: ["rate<=1"],

    wrong_concurrent_response_code_count: ["count>=0"],

  },

};



function bizCodeForIter(iter) {

  // Chỉ 3 lần sai trên 10 iteration: iter 0,1,2 cho 01, những cái khác cho 00

  return iter < 3 ? "01" : "00";

}



const stepBiz = createStep({

  name: "biz",

  endpoint: () =>

    bizApi({

      body: JSON.stringify({ responseCode: bizCodeForIter(__ITER) }),

      headers: { "Content-Type": "application/json" },

      timeout: 2000,

    }),

  checks: [assertStatus(200), assertPath("result.responseCode", "00")],

  thresholds: [

    addToMetricRate("wrong_response_code_rate", [assertStatus(200), assertPath("result.responseCode", "00")]),

    addToMetricCount("wrong_response_code_count", [assertStatus(200), assertPath("result.responseCode", "00")]),

    // `failIf=all`: chỉ sai khi tất cả check đều fail; ở đây chỉ `assertPath` fail  

    addToMetricRate(

      "wrong_response_code_allfail_rate",

      [assertStatus(200), assertPath("result.responseCode", "00")],

      { failIf: "all" },

    ),

  ],

});



const concurrentGroup = concurrent(

  [

    createStep({

      name: "biz-A",

      endpoint: () =>

        bizApi({

          body: JSON.stringify({ responseCode: __ITER < 2 ? "01" : "00" }), // 2 lần sai

          headers: { "Content-Type": "application/json" },

          timeout: 2000,

        }),

      checks: [assertStatus(200), assertPath("result.responseCode", "00")],

      thresholds: [addToMetricCount("wrong_concurrent_response_code_count", [assertPath("result.responseCode", "00")])],

    }),

    createStep({

      name: "biz-B",

      endpoint: () =>

        bizApi({

          body: JSON.stringify({ responseCode: __ITER < 1 ? "01" : "00" }), // 1 lần sai

          headers: { "Content-Type": "application/json" },

          timeout: 2000,

        }),

      checks: [assertStatus(200), assertPath("result.responseCode", "00")],

      thresholds: [addToMetricCount("wrong_concurrent_response_code_count", [assertPath("result.responseCode", "00")])],

    }),

  ],

  "ft-concurrent",

);



export const { setup, runScenario, teardown } = createScenario({

  flowName: "FT Metric Attachments",

  plan: [flow([stepBiz], "ft-flow"), concurrentGroup],

});

