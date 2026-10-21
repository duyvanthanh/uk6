import { assertStatus, concurrent, createEndpoint, createScenario, createStep, flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');



const apiA = createEndpoint({

  baseUrl,

  path: '/concurrent-a',

  method: 'POST',

  name: 'FT conc A',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const apiB = createEndpoint({

  baseUrl,

  path: '/concurrent-b',

  method: 'POST',

  name: 'FT conc B',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const apiUse = createEndpoint({

  baseUrl,

  path: '/use-shared',

  method: 'POST',

  name: 'FT use shared',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



const concurrentSteps = [

  createStep({

    name: 'A sets sharedKey',

    endpoint: apiA,

    preprocessor: () => apiA({ timeout: 2000, body: { value: 'A' } }),

    checks: [assertStatus(200)],

    extractors: { sharedKey: 'value' },

  }),

  createStep({

    name: 'B overwrites sharedKey',

    endpoint: apiB,

    preprocessor: () => apiB({ timeout: 2000, body: { value: 'B' } }),

    checks: [assertStatus(200)],

    extractors: { sharedKey: 'value' },

  }),

];



const flowSteps = [

  createStep({

    name: 'use sharedKey',

    endpoint: apiUse,

    preprocessor: (ctx) => apiUse({ timeout: 2000, body: { sharedKey: ctx.sharedKey } }),

    checks: [assertStatus(200)],

    postprocessor: (_res, ctx) => console.log(`FT_CONCURRENT_OVERWRITE_OK sharedKey=${ctx.sharedKey}`),

  }),

];



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Concurrent Extractor Overwrite',

  plan: [concurrent(concurrentSteps, 'ft-overwrite'), flow(flowSteps)],

});



