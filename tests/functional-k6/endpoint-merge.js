import { Flow, assertStatus, createEndpoint, createStep } from '../../dist/esm/src/k6-framework/index.js';



const baseUrl = __ENV.FT_BASE_URL;

if (!baseUrl) {

  throw new Error('Missing __ENV.FT_BASE_URL for functional k6 test');

}



const mergeApi = createEndpoint({

  baseUrl,

  path: '/merge',

  method: 'POST',

  name: 'FT merge',

  defaultHeaders: () => ({ 'Content-Type': 'application/json' }),

  defaultBody: () => ({

    a: 1,

    nested: { x: 1, y: 2 },

    arr: [{ id: 1, v: 1 }, { id: 2, v: 2 }],

  }),

});



export const options = {

  scenarios: {

    main: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'runScenario', gracefulStop: '0s' },

  },

};



export function runScenario() {

  const flow = new Flow('FT Endpoint Merge', { continueOnFailure: false, delayBetweenSteps: 0 });



  const step = createStep({

    name: 'merge call',

    endpoint: mergeApi,

    preprocessor: () =>

      mergeApi({

        timeout: 2000,

        params: { q: 'hello world', page: 1 },

        headers: { 'X-Test': 'yes' },

        tags: { foo: 'bar' },

        body: {

          nested: { y: 999 },

          arr: [{ v: 10 }],

        },

      }),

    checks: [assertStatus(200)],

    postprocessor: (res) => {

      const data = res.json();

      const received = (data && data.received) || {};

      const nested = received.nested || {};

      const arr = Array.isArray(received.arr) ? received.arr : [];

      const a0 = arr[0] || {};

      const a1 = arr[1] || {};

      console.log(

        `FT_MERGE_OK nestedX=${nested.x} nestedY=${nested.y} arr0id=${a0.id} arr0v=${a0.v} arr1id=${a1.id} arr1v=${a1.v}`,

      );

    },

  });



  flow.addStep(step);

  flow.execute({});

}

