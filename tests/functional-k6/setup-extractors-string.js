import { assertStatus, createEndpoint, createScenario, createStep, flow, setups } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');



const loginNested = createEndpoint({

  baseUrl,

  path: '/login-nested',

  method: 'POST',

  name: 'FT login nested',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

  defaultBody: () => ({ username: 'u', password: 'p' }),

});



const useExtracted = createEndpoint({

  baseUrl,

  path: '/use-extracted',

  method: 'POST',

  name: 'FT use extracted',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



const setupTasks = [

  createStep({

    name: 'setup extractor string path',

    endpoint: () => loginNested({ timeout: 5000 }),

    checks: [assertStatus(200)],

    extractors: {

      sessionFromExtractor: 'result.session.sessionId',

    },

    postprocessor: (res, ctx) => {

      if (!res || res.status !== 200) throw new Error(`setup login-nested failed: status=${res?.status}`);

      try {

        const body = typeof res.body === 'string' ? res.body : String(res.body);

        console.log(`FT_LOGIN_NESTED_RAW=${body}`);

      } catch (_) {

        // ignore

      }

      if (!ctx.sessionFromExtractor) throw new Error('missing sessionFromExtractor');

      console.log('FT_SETUP_EXTRACTOR_STRING_OK');

    },

  }),

];



const steps = [

  createStep({

    name: 'use extracted session',

    endpoint: useExtracted,

    preprocessor: (ctx) => useExtracted({ timeout: 2000, body: { sessionId: ctx.sessionFromExtractor } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_USE_EXTRACTED_OK'),

  }),

];



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Setup Extractor String',

  plan: [setups(setupTasks), flow(steps)],

});

