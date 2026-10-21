import http from 'k6/http';

import { Flow } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'default', gracefulStop: '0s' },

  },

};



export default function () {

  const flow = new Flow('FT Continue On Failure', { continueOnFailure: true, delayBetweenSteps: 0 });



  flow.addStep({

    name: 'step fail',

    endpoint: {

      method: 'GET',

      getUrl: () => `${baseUrl}/fail`,

      getRequestConfig: () => ({ timeout: 2000, tags: { name: 'fail' }, headers: {} }),

      params: {},

    },

    checks: [],

    extractors: {},

  });



  flow.addStep({

    name: 'step after',

    endpoint: {

      method: 'GET',

      getUrl: () => `${baseUrl}/after`,

      getRequestConfig: () => ({ timeout: 2000, tags: { name: 'after' }, headers: {} }),

      params: {},

    },

    checks: [],

    extractors: {},

    postprocessor: (res) => {

      if (res && res.status === 200) console.log('FT_CONTINUE_OK');

    },

  });



  flow.execute({});



  // Bảo đảm k6 vẫn giữ module `http` load để tránh tree-shaking ở một số bundler. 

  if (http && typeof http.get !== 'function') throw new Error('unexpected');

}



