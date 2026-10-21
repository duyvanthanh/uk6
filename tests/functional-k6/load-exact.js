import { Flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL || 'http://127.0.0.1:1';



const flow = new Flow('FT Exact Load', { continueOnFailure: false, delayBetweenSteps: 0 });

flow.addStep({

  name: 'exact load step',

  endpoint: {

    method: 'GET',

    getUrl: () => `${baseUrl}/load-exact`,

    getRequestConfig: () => ({ timeout: 1000, tags: { name: 'load-exact' }, headers: {} }),

    params: {},

  },

  load: 0.5,

  loadMode: 'exact',

});



export const options = {

  scenarios: {

    main: { executor: 'per-vu-iterations', vus: 10, iterations: 1, exec: 'default', gracefulStop: '0s' },

  },

};



export default function () {

  flow.execute({});

}

