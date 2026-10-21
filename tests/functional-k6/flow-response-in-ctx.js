import { assertStatus, concurrent, createEndpoint, createScenario, createStep, flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) {

  throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');

}



const login = createEndpoint({

  baseUrl,

  path: '/login',

  method: 'POST',

  name: 'FT login',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

  defaultBody: () => ({ username: 'u', password: 'p' }),

});



const api1 = createEndpoint({

  baseUrl,

  path: '/api1',

  method: 'POST',

  name: 'FT api1',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const concurrentA = createEndpoint({

  baseUrl,

  path: '/concurrent-a',

  method: 'POST',

  name: 'FT concurrent-a',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const concurrentB = createEndpoint({

  baseUrl,

  path: '/concurrent-b',

  method: 'POST',

  name: 'FT concurrent-b',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



export const options = {

  scenarios: {

    main: {

      executor: 'shared-iterations',

      vus: 1,

      iterations: 1,

      exec: 'runScenario',

      gracefulStop: '0s',

    },

  },

};



const steps = [

  createStep({

    name: 'loginStep',

    endpoint: () => login({ timeout: 2000 }),

    checks: [assertStatus(200)],

    extractors: { sessionId: 'sessionId' },

    postprocessor: (_res, ctx) => {

      if (ctx.loginStep === undefined) {

        console.log('FT_FLOW_CTX_STEP_ABSENT loginStep');

      } else {

        console.log('FT_FLOW_CTX_STEP_PRESENT loginStep');

      }

      if (ctx.sessionId === 'ft-session') {

        console.log(`FT_FLOW_EXTRACTOR_OK sessionId=${ctx.sessionId}`);

      } else {

        console.log(`FT_FLOW_EXTRACTOR_BAD sessionId=${ctx.sessionId}`);

      }

    },

  }),

];



const concurrentSteps = [

  createStep({

    name: 'concurrentStepA',

    endpoint: concurrentA,

    preprocessor: (ctx) => concurrentA({ timeout: 2000, body: { value: ctx.sessionId } }),

    checks: [assertStatus(200)],

    extractors: { concurrentValueA: 'value' },

    postprocessor: (_res, ctx) => {

      if (ctx.concurrentStepA === undefined) {

        console.log('FT_CONCURRENT_CTX_STEP_ABSENT A');

      } else {

        console.log('FT_CONCURRENT_CTX_STEP_PRESENT A');

      }

      if (ctx.concurrentValueA === 'ft-session') {

        console.log('FT_CONCURRENT_EXTRACTOR_OK A');

      } else {

        console.log(`FT_CONCURRENT_EXTRACTOR_BAD A value=${ctx.concurrentValueA}`);

      }

    },

  }),

  createStep({

    name: 'concurrentStepB',

    endpoint: concurrentB,

    preprocessor: (ctx) => concurrentB({ timeout: 2000, body: { value: ctx.sessionId } }),

    checks: [assertStatus(200)],

    extractors: { concurrentValueB: 'value' },

    postprocessor: (_res, ctx) => {

      if (ctx.concurrentStepB === undefined) {

        console.log('FT_CONCURRENT_CTX_STEP_ABSENT B');

      } else {

        console.log('FT_CONCURRENT_CTX_STEP_PRESENT B');

      }

      if (ctx.concurrentValueB === 'ft-session') {

        console.log('FT_CONCURRENT_EXTRACTOR_OK B');

      } else {

        console.log(`FT_CONCURRENT_EXTRACTOR_BAD B value=${ctx.concurrentValueB}`);

      }

    },

  }),

];



const after = [

  createStep({

    name: 'useSessionFromStepResponse',

    endpoint: api1,

    preprocessor: (ctx) => api1({ timeout: 2000, body: { sessionId: ctx.sessionId } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_FLOW_USE_EXTRACTED_SESSION_OK'),

  }),

];



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Flow Response In Ctx',

  plan: [flow(steps, 'ft-flow-ctx'), concurrent(concurrentSteps, 'ft-concurrent-ctx'), flow(after, 'ft-after')],

});



