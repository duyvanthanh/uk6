import { sleep } from 'k6';

import { createCsvDriver, createCsvPicker } from '../../dist/esm/src/k6-framework/index.js';



export const options = {

  scenarios: {

    perVu: { executor: 'per-vu-iterations', vus: 2, iterations: 2, exec: 'perVuScenario', gracefulStop: '0s' },

    global: { executor: 'per-vu-iterations', vus: 2, iterations: 2, exec: 'globalScenario', gracefulStop: '0s' },

    fixedVu: { executor: 'per-vu-iterations', vus: 2, iterations: 2, exec: 'fixedVuScenario', gracefulStop: '0s' },

    split: { executor: 'per-vu-iterations', vus: 2, iterations: 2, exec: 'splitScenario', gracefulStop: '0s' },

    splitByMaxConstant: { executor: 'constant-vus', vus: 2, duration: '1s', exec: 'splitByMaxConstantScenario', gracefulStop: '0s' },

    splitByMaxRamping: {

      executor: 'ramping-vus',

      startVUs: 1,

      stages: [

        { duration: '1s', target: 1 },

        { duration: '1s', target: 3 },

        { duration: '1s', target: 3 },

      ],

      exec: 'splitByMaxRampingScenario',

      gracefulRampDown: '0s',

      gracefulStop: '0s',

    },

    globalRamping: {

      executor: 'ramping-vus',

      startVUs: 1,

      stages: [

        { duration: '1s', target: 1 },

        { duration: '1s', target: 2 },

        { duration: '1s', target: 2 },

      ],

      exec: 'globalRampingScenario',

      gracefulRampDown: '0s',

      gracefulStop: '0s',

    },

  },

};



let csvPath = __ENV.FT_CSV_PATH;

if (!csvPath) {

  if (import.meta && typeof import.meta.resolve === 'function') {

    csvPath = import.meta.resolve('./data/users.csv');

  }

}

if (!csvPath) {

  throw new Error('Missing FT_CSV_PATH and import.meta.resolve is not available');

}



const driver = createCsvDriver(csvPath, { ctxKey: 'row' });



const pickPerVu = createCsvPicker(driver, { mode: 'per_vu' });

const pickGlobal = createCsvPicker(driver, { mode: 'global' });

const pickFixedVu = createCsvPicker(driver, { mode: 'fixed_vu' });

const pickSplit = createCsvPicker(driver, { mode: 'split', vuCount: 2 });

const pickSplitByMaxConstant = createCsvPicker(driver, { mode: 'split_by_max_vus', maxVUs: 2 });

const pickSplitByMaxRamping = createCsvPicker(driver, { mode: 'split_by_max_vus', maxVUs: 3 });



const scenarioLogSeen = {};



// Phát ra snapshot xác định trước của CSV để parse, mỗi VU một lần

const parsedEmittedByVu = {};

function emitParsedSnapshotOnce() {

  if (parsedEmittedByVu[__VU]) return;

  parsedEmittedByVu[__VU] = true;



  const rows = driver && driver.rows ? driver.rows : [];

  const summary = {

    rowCount: Array.isArray(rows) ? rows.length : -1,

    headers: rows && rows[0] ? Object.keys(rows[0]) : [],

    rows: Array.isArray(rows) ? rows.slice(0, 4) : [],

  };

  console.log(`FT_CSV_PARSED vu=${__VU} ${JSON.stringify(summary)}`);

}



function logScenarioRecord(marker, row, ctx) {

  console.log(`FT_${marker} vu=${__VU} iter=${__ITER} id=${row ? row.id : 'null'} name=${row ? row.name : 'null'} ctx=${ctx.row ? 'ok' : 'missing'}`);

}



function logScenarioRecordOncePerVuIter(marker, row, ctx, maxIter = 1) {

  const key = `${marker}:${__VU}:${__ITER}`;

  if (scenarioLogSeen[key]) return;

  if (__ITER > maxIter) return;

  scenarioLogSeen[key] = true;

  logScenarioRecord(marker, row, ctx);

}



export function perVuScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickPerVu(ctx);

  logScenarioRecord('CSV_PER_VU', row, ctx);

}



export function globalScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickGlobal(ctx);

  logScenarioRecord('CSV_GLOBAL', row, ctx);

}



export function fixedVuScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickFixedVu(ctx);

  logScenarioRecord('CSV_FIXED_VU', row, ctx);

}



export function splitScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickSplit(ctx);

  logScenarioRecord('CSV_SPLIT', row, ctx);

}



export function splitByMaxConstantScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickSplitByMaxConstant(ctx);

  logScenarioRecordOncePerVuIter('CSV_SPLIT_BY_MAX_CONSTANT', row, ctx, 1);

  sleep(0.08);

}



export function splitByMaxRampingScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickSplitByMaxRamping(ctx);

  logScenarioRecordOncePerVuIter('CSV_SPLIT_BY_MAX_RAMPING', row, ctx, 1);

  sleep(0.1);

}



export function globalRampingScenario() {

  emitParsedSnapshotOnce();

  const ctx = {};

  const row = pickGlobal(ctx);

  logScenarioRecordOncePerVuIter('CSV_GLOBAL_RAMPING', row, ctx, 0);

  sleep(0.1);

}

