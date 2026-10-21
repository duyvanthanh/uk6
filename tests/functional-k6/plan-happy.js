import {

  assertStatus,

  concurrent,

  createEndpoint,

  createScenario,

  createStep,

  extractValues,

  flow,

  setups,

  teardowns,

} from '../../dist/esm/src/k6-framework/index.js';



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



const api2 = createEndpoint({

  baseUrl,

  path: '/api2',

  method: 'POST',

  name: 'FT api2',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const apiSkip = createEndpoint({

  baseUrl,

  path: '/api-skip',

  method: 'POST',

  name: 'FT apiSkip',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const teardownApi = createEndpoint({

  baseUrl,

  path: '/teardown',

  method: 'POST',

  name: 'FT teardown',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



const setupTasks = [

  createStep({

    name: 'setup login',

    endpoint: () => login({ timeout: 2000 }),

    checks: [assertStatus(200)],

    extractors: extractValues({ sessionId: ['sessionId'] }),

    postprocessor: () => console.log('FT_SETUP_OK'),

  }),

];



const concurrentSteps = [

  createStep({

    name: 'concurrent api2',

    endpoint: api2,

    load: 1,

    preprocessor: (ctx) => api2({ timeout: 2000, body: { sessionId: ctx.sessionId, from: 'concurrent' } }),

    checks: [assertStatus(200)],

  }),

  createStep({

    name: 'concurrent skipped',

    endpoint: apiSkip,

    load: 0,

    preprocessor: (ctx) => apiSkip({ timeout: 2000, body: { sessionId: ctx.sessionId } }),

    checks: [assertStatus(200)],

  }),

];



const sequentialSteps = [

  createStep({

    name: 'seq api1',

    endpoint: api1,

    preprocessor: (ctx) => api1({ timeout: 2000, body: { sessionId: ctx.sessionId, from: 'seq1' } }),

    checks: [assertStatus(200)],

  }),

  createStep({

    name: 'seq api2',

    endpoint: api2,

    preprocessor: (ctx) => api2({ timeout: 2000, body: { sessionId: ctx.sessionId, from: 'seq2' } }),

    checks: [assertStatus(200)],

  }),

];



const teardownTasks = [

  createStep({

    name: 'teardown call',

    endpoint: teardownApi,

    preprocessor: (ctx) => teardownApi({ timeout: 2000, body: { sessionId: ctx.sessionId } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_TEARDOWN_OK'),

  }),

];



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



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Plan Happy',

  plan: [setups(setupTasks), concurrent(concurrentSteps, 'ft-concurrent'), flow(sequentialSteps, 'ft-flow'), teardowns(teardownTasks)],

});

