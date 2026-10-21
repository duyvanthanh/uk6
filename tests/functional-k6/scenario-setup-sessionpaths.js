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



const useSession = createEndpoint({

  baseUrl,

  path: '/use-session',

  method: 'POST',

  name: 'FT use session',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



const setupTasks = [

  createStep({

    name: 'setup login via sessionPaths',

    endpoint: () => loginNested({ timeout: 2000 }),

    sessionPaths: ['result.session.sessionId', 'sessionId'],

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_SETUP_SESSIONPATHS_OK'),

  }),

];



const steps = [

  createStep({

    name: 'use session',

    endpoint: useSession,

    preprocessor: (ctx) => useSession({ timeout: 2000, body: { sessionId: ctx.sessionId } }),

    checks: [assertStatus(200)],

    postprocessor: () => console.log('FT_USE_SESSION_OK'),

  }),

];



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Setup SessionPaths',

  plan: [setups(setupTasks), flow(steps)],

});



