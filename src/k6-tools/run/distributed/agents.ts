import * as fs from 'node:fs';

import { safeReadJson } from '../utils/fs.js';

import * as path from 'node:path';



/** @internal Đọc agentIds đang online từ heartbeat ở shared folder */

export function listOnlineAgentIds(agentsDir: string, ttlMs: number) {

    try {

        if (!agentsDir || !fs.existsSync(agentsDir)) return [];

        const now = Date.now();

        const files = fs

            .readdirSync(agentsDir)

            .filter((f) => String(f).toLowerCase().endsWith('.json'))

            .map((f) => path.join(agentsDir, f));

        const ids = [];

        for (const filePath of files) {

            const parsed = safeReadJson(filePath);

            if (!parsed) continue;

            const agentId = (parsed.agentId || parsed.nodeId || path.basename(filePath, '.json') || '').trim();

            const lastSeenEpochMs = Number(parsed.lastSeenEpochMs || 0);

            if (!agentId || !Number.isFinite(lastSeenEpochMs) || lastSeenEpochMs <= 0) continue;

            if (now - lastSeenEpochMs <= ttlMs) {

                ids.push(agentId);

            }

        }

        return Array.from(new Set(ids)).sort();

    } catch (_) {

        return [];

    }

}



/** @internal Check các agents có status */

export function areExpectedAgentsSettled({ runsDir, runId, expectedAgentIds }: { runsDir: string, runId: string, expectedAgentIds: any}) {

    try {

        if (!expectedAgentIds || expectedAgentIds.length === 0) return true;

        const nodesDir = path.join(runsDir, runId, 'nodes');

        if (!fs.existsSync(nodesDir)) return false;



        const byAgent = new Map();

        const nodeDirs = fs

            .readdirSync(nodesDir, { withFileTypes: true })

            .filter((d) => d.isDirectory())

            .map((d) => d.name);

        for (const nodeId of nodeDirs) {

            const statusFile = path.join(nodesDir, nodeId, 'status.json');

            const status = safeReadJson(statusFile);

            if (!status) continue;

            const agentId = (status.agentId || '').trim();

            if (!agentId) continue;

            byAgent.set(agentId, String(status.state || ''));

        }



        const settledStates = new Set(['done', 'cancelled', 'no_variant_available']);

        for (const agentId of expectedAgentIds) {

            const st = byAgent.get(agentId);

            if (!st || !settledStates.has(st)) return false;

        }

        return true;

    } catch (_) {

        return false;

    }

}

