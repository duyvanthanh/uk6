import { Flow } from "uk6/k6-framework";



export const options = {

  scenarios: {

    main: { executor: "per-vu-iterations", vus: 2, iterations: 1, exec: "default", gracefulStop: "0s" },

  },

};



export default function () {

  const flow = new Flow("Inspect Self Import", { continueOnFailure: true, delayBetweenSteps: 0 });

  // Không làm gì, chỉ đảm bảo phân giải module bình thường sau khi bundling 

  flow;

}



