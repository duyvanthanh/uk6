import { Flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL || 'http://127.0.0.1:1';



const flow = new Flow('FT Concurrent Exact Load', { continueOnFailure: false, delayBetweenSteps: 0 });

flow.addConcurrentGroup({

  name: 'concurrent',

  steps: [

    {

      name: 'half load',

      endpoint: {

        method: 'POST',

        getUrl: () => `${baseUrl}/api1`,

        getRequestConfig: () => ({ timeout: 1000, tags: { name: 'api1' }, headers: {} }),

        params: {},

      },

      load: 0.5,

      loadMode: 'exact',

    },

    {

      name: 'full load',

      endpoint: {

        method: 'POST',

        getUrl: () => `${baseUrl}/api2`,

        getRequestConfig: () => ({ timeout: 1000, tags: { name: 'api2' }, headers: {} }),

        params: {},

      },

      load: 1,

    },

  ],

});



export const options = {

  scenarios: {

    main: { executor: 'per-vu-iterations', vus: 10, iterations: 1, exec: 'default', gracefulStop: '0s' },

  },

};



export default function () {

  flow.execute({});

}



