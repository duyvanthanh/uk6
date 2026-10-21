import * as fs from 'node:fs';



/** @internal Sửa dashboard HTML để trỏ tới đúng tên file raw log trong thư mục run. */

export function rewriteDashboardHtmlDataSources(

    htmlFilePath: string,

    { rawJsonFileName, rawJsFileName }: { rawJsonFileName: string; rawJsFileName: string }

) {

    try {

        if (!htmlFilePath || !fs.existsSync(htmlFilePath)) return false;

        const html = fs.readFileSync(htmlFilePath, 'utf8');

        const next = String(html || '')

            .replaceAll('error_log.raw.json', rawJsonFileName)

            .replaceAll('error_log.raw.js', rawJsFileName);

        fs.writeFileSync(htmlFilePath, next, 'utf8');

        return true;

    } catch (_) {

        return false;

    }

}



