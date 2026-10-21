import { Flow } from '../../dist/esm/src/k6-framework/index.js';



// Trigger load validation during init.

const flow = new Flow('FT Invalid Load', { continueOnFailure: false, delayBetweenSteps: 0 });

flow.addStep({

  name: 'invalid load step',

  endpoint: {

    method: 'GET',

    getUrl: () => 'http://127.0.0.1:1/ok',

    getRequestConfig: () => ({ timeout: 1000, tags: { name: 'dummy' }, headers: {} }),

    params: {},

  },

  load: 1.5,

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'default', gracefulStop: '0s' },

  },

};



export default function () {

  // no-op

}

