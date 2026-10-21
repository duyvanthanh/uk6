#!/usr/bin/env node

/**

 * Điểm vào CLI `uk6`.

 *

 * File này tồn tại để `npm` tạo shim executable đúng trong `node_modules/.bin`.

 * Nó chỉ đơn giản chạy runner k6 được implement trong `run.ts`.

 */

import "./run.js";
