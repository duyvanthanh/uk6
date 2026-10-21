export type HelpTextOptions = {

    defaultEnvName: string;

};



/**

 * Trả về `uk6 --help` text

 *

 */

export function getHelpText(opts: HelpTextOptions): string {

    const lines = [

        '',

        '',

        'uk6 - k6 script runner',

        '',

        'CÁCH DÙNG',

        '  uk6 <script> [tùy-chọn-uk6...] [-- <tham-số-k6...>]',

        '  uk6 --inspect <script> [--out=<dir>] [--k6=project|local] [-- <tham-số-k6-inspect...>]',

        '',

        'MÔ TẢ',

        '  uk6 sẽ bundle script của bạn để chạy với k6 (Rollup) vào `.k6-build/`, (tuỳ chọn) load file env,',

        '  sau đó chạy `k6 run` kèm các tham số bạn truyền vào. Ngoài ra uk6 có thể ghi log k6 ra file,',
        '  lọc log lỗi/raw event và sinh dashboard HTML.',
        '',

        'INSPECT',

        '  `uk6 --inspect <script>` chạy `k6 inspect --execution-requirements` và sinh biểu đồ VU/time (HTML) trong `./inspect-report/`.',

        '  Tuỳ chọn: `--out=<dir>` để đổi thư mục output.',

        '',

        'SCRIPT',

        '  <script> là file JS/TS entry bạn muốn chạy bằng k6. Ví dụ: `src/scenarios/login.ts`',

        '',

        'TUỲ CHỌN UK6',

        '  -h, --help',

        '      Hiển thị trợ giúp và thoát.',

        '',

        '  --env=<name>',

        '      Load env từ `.env.<name>` ở thư mục hiện tại.',

        `      Mặc định: \`.env.${opts.defaultEnvName}\` (khi không truyền --env).`,

        '',

        '  --k6=project|local',

        '      Chọn binary k6.',

        '      - project: dùng `./k6/k6.exe` trong thư mục hiện tại (bắt buộc tồn tại).',

        '      - local:   dùng `k6` trong PATH.',

        '      Mặc định (auto): ưu tiên `./k6/k6.exe` nếu có, nếu không thì dùng `k6` trong PATH.',

        '',

        '  --raw[=true|false]',
        '      Giữ lại `error_log.raw.json` sau khi chạy xong.',
        '      Mặc định: false. Lưu ý: sẽ tự bật true khi bật `--dashboard`.',
        '',
        '  --error[=true|false]',
        '      Run như mode thường nhưng vẫn ghi `error_log.json`.',
        '      Chỉ giữ các event lỗi: failed status, failed check, runtime/exception.',
        '      Giữ full payload/request/response detail, không beautify body.',
        '      Mặc định: false.',
        '',
        '  --dashboard[=true|false]',
        '      Sinh dashboard HTML tại `./dashboard-report/api_dashboard.html`.',
        '      Tự mở dashboard live trong browser lúc start và mở offline HTML lúc run kết thúc.',
        '      Mặc định: false.',
        '',
        '  --step-logs=auto|full|errors-only|off',
        '      Điều khiển structured step logs của framework k6.',
        '      - auto: mặc định. Run thường tắt log; `--error` chỉ log full cho lỗi; `--dashboard` log compact success + full error; `--dashboard --debug` log full.',
        '      - full: log mọi step call thành JSON.',

        '      - errors-only: chỉ log step lỗi.',

        '      - off: tắt step call/error logs (exception runtime vẫn có thể được in).',

        '',

        '  --distributed=<shared_folder>',

        '      Chạy distributed qua shared folder: sẽ tạo request file (lệnh + start time) và chờ đến giờ để chạy đồng bộ.',

        '',

        '  --distributed-delay-ms=<ms>',

        '      Độ trễ trước khi start (để sync đồng hồ).',

        '      Mặc định: 10000.',

        '',

        '  --distributed-cleanup-after-ms=<ms>',

        '      TTL request file trong shared folder (tính từ start time). Listener sẽ tự xoá request khi hết hạn.',

        '      Mặc định: 60000.',

        '',

        '  --distributed-run-id=<id>',

        '      Run ID (group request + reports). Nếu không truyền sẽ tự sinh.',

        '',

        '  --distributed-node-id=<id>',

        '      Node ID cho report/status (mặc định: <hostname>-<pid>).',

        '',

        '  --log-console',
        '      Giữ lại cờ tương thích cho CLI. Không còn alias `--log-output=console`.',
        '',
        '  --debug[=true|false]',
        '      Bật log debug bổ sung của uk6 runner.',
        '      Mặc định: false.',
        '',
        '  --treeshake[=true|false]',
        '      Bật/tắt tree-shaking khi bundle (giảm bundle size khi script chỉ dùng 1 phần nhỏ framework).',
        '      Mặc định: true. (Có thể tắt qua env `UK6_TREESHAKE=0`)',
        '',
        '  --bundle-sourcemap=off|inline|external',

        '      Sourcemap cho file bundle.',

        '      - off:      mặc định, nhẹ nhất.',

        '      - inline:   embed sourcemap vào JS (to nhưng debug tiện).',

        '      - external: tạo file `.map` riêng cùng thư mục.',

        '      Mặc định: off. (env: `UK6_BUNDLE_SOURCEMAP`)',

        '',

        '  --bundle-features=auto|all|http|http,sql',

        '      Điều khiển các tính năng được bundle (giảm size bằng cách bỏ logic không cần thiết).',

        '      - auto:     mặc định, tự phát hiện cần SQL hay không.',

        '      - all:      không prune tính năng (bundle đầy đủ).',

        '      - http:     chỉ HTTP; nếu dùng SQL endpoint sẽ lỗi rõ ràng.',

        '      - http,sql: ép bật SQL.',

        '      Mặc định: auto. (env: `UK6_BUNDLE_FEATURES`)',

        '',

        '  --vu-mem[=true|false]',

        '      Poll RAM (RSS/WorkingSet) của process k6 và in rồi ước tính avg/peak per VU (chia theo max VUs từ summary-export).',

        '      Mặc định: false. (Có thể bật qua env `UK6_VU_MEM=true`)',

        '',

        '  --vu-mem-interval-ms=<ms>',

        '      Chu kỳ poll RAM (>= 200ms). Mặc định: 1000. (env: `UK6_VU_MEM_INTERVAL_MS`)',

        '',

        '  --vu-mem-safety=<0..1>',

        '      Hệ số an toàn khi tính gợi ý max VUs từ RAM free. Mặc định: 0.8 (env: `UK6_VU_MEM_SAFETY`)',

        '',

        '  --proxy[=true|false]',
        '      Giữ nguyên các biến môi trường proxy khi spawn k6.',
        '      Mặc định: false, tức uk6 sẽ ép no-proxy cho child process.',
        '',
        'THAM SỐ K6',
        '  Tất cả tham số không được nhận diện là uk6 option sẽ được forward nguyên trạng sang `k6 run`.',
        '  Mẹo: dùng `--` để tách rõ uk6 options và k6 args.',
        '',

        'VÍ DỤ',
        '  uk6 src/scenarios/login.ts --env=sit --vus 10 --duration 30s',
        '  uk6 src/scenarios/login.ts --dashboard',
        '  uk6 src/scenarios/login.ts --log-console -- --vus 5 --duration 10s',
        '',
    ];



    return lines.join('\n');

}

