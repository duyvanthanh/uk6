import * as path from 'node:path';



/** @internal Tạo spawn spec chạy k6 (khác nhau giữa Windows và OS khác). */

export function buildK6SpawnSpec(k6Path: any, k6Args: any) {

    if (process.platform !== 'win32') {

        return { command: k6Path, args: k6Args, options: { shell: false } };

    }



    const ext = path.extname(String(k6Path || '')).toLowerCase();

    const isBareCommand = !String(k6Path || '').includes('\\') && !String(k6Path || '').includes('/');



    // Nếu k6Path là bare command ("k6") thì trên Windows có thể resolve sang k6.cmd trong PATH.

    // Trường hợp này chạy qua cmd.exe (không dùng `shell:true`) để vẫn quản lý được process tree.

    if (isBareCommand && !ext) {

        const quoted = [String(k6Path), ...k6Args.map((a: any) => {

            const s = String(a);

            return s.includes(' ') || s.includes('"') ? `"${s.replaceAll('"', '\\"')}"` : s;

        })].join(' ');

        return {

            command: 'cmd.exe',

            args: ['/d', '/s', '/c', quoted],

            options: { shell: false }

        };

    }



    // Nếu k6Path trỏ tới .cmd/.bat thì cũng phải chạy qua cmd.exe.

    if (ext === '.cmd' || ext === '.bat') {

        const quoted = [`"${k6Path}"`, ...k6Args.map((a: any) => {

            const s = String(a);

            return s.includes(' ') || s.includes('"') ? `"${s.replaceAll('"', '\\"')}"` : s;

        })].join(' ');

        return {

            command: 'cmd.exe',

            args: ['/d', '/s', '/c', quoted],

            options: { shell: false }

        };

    }



    // .exe (hoặc absolute path) có thể spawn trực tiếp.

    return { command: k6Path, args: k6Args, options: { shell: false } };

}

