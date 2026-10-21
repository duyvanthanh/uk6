import { createEndpoint, createScenario, createStep, flow, setups } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL || 'http://127.0.0.1:1';



const dummy = createEndpoint({

  baseUrl,

  path: '/dummy',

  method: 'GET',

  name: 'FT dummy',

});



const setupTasks = [createStep({ name: 'setup dummy', endpoint: dummy })];

const flowSteps = [createStep({ name: 'flow dummy', endpoint: dummy })];



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



// `setups(...)` không ở đầu thì lỗi 

export const { setup, runScenario, teardown } = createScenario({

  flowName: 'FT Invalid Plan Placement',

  plan: [flow(flowSteps, 'flow-first'), setups(setupTasks, 'setup-not-first')],

});

