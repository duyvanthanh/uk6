// @ts-nocheck

/**

 * Tool tạo dashboard từ raw log (chạy phía Node).

 *

 * Chuyển k6 structured JSON logs (được emit bởi `Flow` / scenario runner) thành dashboard HTML tự chứa.

 *

 * Export chính:

 * - {@link generateRawDashboard} (ghi file HTML ra disk)

 */

import * as fs from 'node:fs';

import { generateRawDashboard } from './raw-dashboard/generateRawDashboard.js';



export { generateRawDashboard };



