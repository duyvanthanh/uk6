import * as fs from "node:fs";
import * as path from "node:path";

import { aggregateApiCalls } from "../../raw-dashboard/api/aggregateApiCalls.js";
import { isFailureEntry } from "../logs/filterFailureEntries.js";
import { writeJsonArrayFileStream, writeJsonArrayJsFileStream } from "../utils/fs.js";

export type LiveEventStore = ReturnType<typeof createLiveEventStore>;

export function createLiveEventStore(params: {
    dashboardRawLogFile: string;
    dashboardRawLogJsFile: string;
    persistRawFiles?: boolean;
    errorLogFile?: string | null;
}) {
    const { dashboardRawLogFile, dashboardRawLogJsFile } = params;
    const persistRawFiles = params.persistRawFiles !== false;
    const errorLogFile = params.errorLogFile || null;

    const entries: any[] = [];
    const failureEntries: any[] = [];
    let flushTimer: NodeJS.Timeout | null = null;

    function ensureDir(filePath: string) {
        const dir = path.dirname(filePath);
        if (dir && !fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    function flushNow() {
        if (persistRawFiles) {
            ensureDir(dashboardRawLogFile);
            ensureDir(dashboardRawLogJsFile);
            writeJsonArrayFileStream(dashboardRawLogFile, entries);
            writeJsonArrayJsFileStream(dashboardRawLogJsFile, "__RAW_LOG_DATA__", entries);
        }
        if (errorLogFile) {
            ensureDir(errorLogFile);
            writeJsonArrayFileStream(errorLogFile, failureEntries);
        }
    }

    function scheduleFlush() {
        if (flushTimer) return;
        flushTimer = setTimeout(() => {
            flushTimer = null;
            flushNow();
        }, 250);
    }

    return {
        add(entry: any) {
            entries.push(entry);
            if (errorLogFile && isFailureEntry(entry)) {
                failureEntries.push(entry);
            }
            scheduleFlush();
        },
        getEntries() {
            return entries.slice();
        },
        getFailureEntries() {
            return failureEntries.slice();
        },
        getSummary() {
            return aggregateApiCalls(entries);
        },
        flushNow() {
            if (flushTimer) {
                clearTimeout(flushTimer);
                flushTimer = null;
            }
            flushNow();
        },
    };
}
