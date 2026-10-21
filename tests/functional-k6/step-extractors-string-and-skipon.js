import { assertStatus, createEndpoint, createScenario, createStep, flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');



const apiData = createEndpoint({

  baseUrl,

  path: '/data',

  method: 'GET',

  name: 'FT data',

});



const apiSkip = createEndpoint({

  baseUrl,

  path: '/skip-me',

  method: 'GET',

  name: 'FT skip',

});



const apiUse = createEndpoint({

  baseUrl,

  path: '/use-id',

  method: 'POST',

  name: 'FT use id',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



const steps = [

  createStep({

    name: 'get data and extract',

    endpoint: () => apiData({ timeout: 2000 }),

    checks: [assertStatus(200)],

    extractors: { id: 'data.id' },

    postprocessor: (_res, ctx) => {

      if (!ctx.id) throw new Error('missing ctx.id');

      console.log(`FT_STEP_EXTRACT_OK id=${ctx.id}`);

    },

  }),

  createStep({

    name: 'skipOn test step',

    endpoint: () => apiSkip({ timeout: 2000 }),

    skipOn: (ctx) => Boolean(ctx.id),

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_SKIPON_RAN'),

  }),

  createStep({

    name: 'use extracted id',

    endpoint: apiUse,

    preprocessor: (ctx) => apiUse({ timeout: 2000, body: { id: ctx.id } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_USE_ID_OK'),

  }),

];



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Step Extractor + SkipOn',

  plan: [flow(steps)],

});



