import * as fs from 'node:fs';

import * as path from 'node:path';



function sleepSync(ms: number) {

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

}



function isRetryableFsError(err: any) {

    const code = err?.code;

    return code === 'EBUSY' || code === 'EPERM' || code === 'EACCES' || code === 'ENOTEMPTY';

}



function withFsRetry<T>(fn: () => T, options: { retries?: number; delayMs?: number } = {}) {

    const retries = typeof options.retries === 'number' ? options.retries : 10;

    const delayMs = typeof options.delayMs === 'number' ? options.delayMs : 50;



    for (let attempt = 0; ; attempt += 1) {

        try {

            return fn();

        } catch (err) {

            if (attempt >= retries || !isRetryableFsError(err)) throw err;

            sleepSync(delayMs);

        }

    }

}



export function getFileSizeSafe(filePath: fs.PathLike) {

    try {

        if (!filePath || !fs.existsSync(filePath)) return null;

        const st = fs.statSync(filePath);

        return st && typeof st.size === 'number' ? st.size : null;

    } catch (_) {

        return null;

    }

}



/** @internal Sao chép file nếu tồn tại. */

export function copyFileIfExists(src: fs.PathLike, dst: string) {

    try {

        if (!fs.existsSync(src)) return false;

        const dir = path.dirname(dst);

        if (!fs.existsSync(dir)) {

            fs.mkdirSync(dir, { recursive: true });

        }

        fs.copyFileSync(src, dst);

        return true;

    } catch (_) {

        return false;

    }

}



/** @internal Sao chép thư mục đệ quy (cố gắng hết sức). */

export function copyDirRecursive(srcDir: string, dstDir: string) {

    try {

        if (!fs.existsSync(srcDir)) return;

        const stat = fs.statSync(srcDir);

        if (!stat.isDirectory()) return;

        if (!fs.existsSync(dstDir)) {

            fs.mkdirSync(dstDir, { recursive: true });

        }

        for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {

            const src = path.join(srcDir, entry.name);

            const dst = path.join(dstDir, entry.name);

            if (entry.isDirectory()) {

                copyDirRecursive(src, dst);

            } else if (entry.isFile()) {

                copyFileIfExists(src, dst);

            }

        }

    } catch (_) {

        // bỏ qua lỗi sao chép

    }

}



/** @internal Ghi JSON gần như atomic (cố gắng hết sức) bằng cách đổi tên file trong cùng thư mục. */

export function writeJsonAtomic(filePath:string, data:any) {

    try {

        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) {

            fs.mkdirSync(dir, { recursive: true });

        }

        const tmp = `${filePath}.${process.pid}.tmp`;

        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');

        fs.renameSync(tmp, filePath);

    } catch (err) {

        // phương án dự phòng: ghi không đảm bảo atomic

        try {

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

        } catch (_) {

            // bỏ qua lỗi

        }

    }

}



/** @internal Đọc JSON từ file (best-effort). */

export function safeReadJson(filePath: fs.PathLike) {

    try {

        if (!filePath || !fs.existsSync(filePath)) return null;

        return JSON.parse(fs.readFileSync(filePath, 'utf8'));

    } catch (_) {

        return null;

    }

}



/** @internal Đọc mảng JSON từ file. */

export function readJsonArray(filePath: fs.PathLike) {

    try {

        if (!fs.existsSync(filePath)) return null;

        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        return Array.isArray(parsed) ? parsed : null;

    } catch (_) {

        return null;

    }

}



export function writeJsonArrayFileStream(filePath: fs.PathLike, items: any[]) {

    const targetPath = String(filePath);

    const dir = path.dirname(targetPath);

    if (dir && !fs.existsSync(dir)) {

        fs.mkdirSync(dir, { recursive: true });

    }



    const tmp = `${targetPath}.${process.pid}.tmp`;

    withFsRetry(() => {

        const fd = fs.openSync(tmp, 'w');

        try {

            fs.writeSync(fd, '[');

            for (let i = 0; i < items.length; i++) {

                if (i > 0) fs.writeSync(fd, ',\n');

                fs.writeSync(fd, JSON.stringify(items[i]));

            }

            fs.writeSync(fd, ']\n');

        } finally {

            try {

                fs.closeSync(fd);

            } catch (_) {

                // ignore

            }

        }

    });



    withFsRetry(() => fs.renameSync(tmp, targetPath));

}



export function writeJsonArrayJsFileStream(filePath: fs.PathLike, globalName: string, items:any[]) {

    const targetPath = String(filePath);

    const dir = path.dirname(targetPath);

    if (dir && !fs.existsSync(dir)) {

        fs.mkdirSync(dir, { recursive: true });

    }



    const tmp = `${targetPath}.${process.pid}.tmp`;

    withFsRetry(() => {

        const fd = fs.openSync(tmp, 'w');

        try {

            fs.writeSync(fd, `window.${globalName} = [`);

            for (let i = 0; i < items.length; i++) {

                if (i > 0) fs.writeSync(fd, ',\n');

                fs.writeSync(fd, JSON.stringify(items[i]));

            }

            fs.writeSync(fd, '];\n');

        } finally {

            try {

                fs.closeSync(fd);

            } catch (_) {

                // ignore

            }

        }

    });



    withFsRetry(() => fs.renameSync(tmp, targetPath));

}

