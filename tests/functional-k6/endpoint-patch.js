import { Flow, assertStatus, createEndpoint, createStep } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) {

  throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');

}



const patchApi = createEndpoint({

  baseUrl,

  path: '/merge',

  method: 'POST',

  name: 'FT patch',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

  defaultBody: () => ({

    sessionId: '',

    nested: { x: 1 },

  }),

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



export function runScenario() {

  const flow = new Flow('FT Endpoint Patch', { continueOnFailure: false, delayBetweenSteps: 0 });



  const step = createStep({

    name: 'patch call',

    endpoint: patchApi,

    preprocessor: () => ({

      timeout: 2000,

      params: { q: 'patch', page: 1 },

      headers: { 'X-Test': 'patch' },

      tags: { mode: 'patch' },

      body: { sessionId: 'ft-session' },

    }),

    checks: [assertStatus(200)],

    postprocessor: (res) => {

      const data = res.json();

      const received = (data && data.received) || {};

      console.log(`FT_PATCH_OK sessionId=${received.sessionId}`);

    },

  });



  flow.addStep(step);

  flow.execute({});

}

