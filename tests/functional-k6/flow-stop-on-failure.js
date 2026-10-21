import { assertStatus, createEndpoint, createScenario, createStep, flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');



const okApi = createEndpoint({

  baseUrl,

  path: '/ok',

  method: 'GET',

  name: 'FT ok',

});



const failApi = createEndpoint({

  baseUrl,

  path: '/fail',

  method: 'GET',

  name: 'FT fail',

});



const afterApi = createEndpoint({

  baseUrl,

  path: '/after',

  method: 'GET',

  name: 'FT after',

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



const steps = [

  createStep({ name: 'ok step', endpoint: () => okApi({ timeout: 2000 }), checks: [assertStatus(200)] }),

  createStep({ name: 'fail step', endpoint: () => failApi({ timeout: 2000 }), checks: [assertStatus(200)] }),

  createStep({ name: 'after step', endpoint: () => afterApi({ timeout: 2000 }), checks: [assertStatus(200)] }),

];



export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Stop On Failure',

  plan: [flow(steps, 'ft-flow')],

});



