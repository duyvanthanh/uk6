export function printHelp(exitCode = 0) {

  const lines = [

    "",

    "uk6 distributed listener",

    "",

    "SỬ DỤNG",

    "  node <distributed-listener.js> --distributed=<shared_folder> [options]",

    "",

    "OPTIONS",

    "  --distributed=<path>     Đường dẫn tới shared folder (bắt buộc).",

    "  --poll-ms=<ms>           Poll interval (default: 1000, min: 250).",

    "  --node-id=<id>           Node identifier dùng cho status/report folders.",

    "  --agent-id=<id>          Stable agent identifier để xác định heartbeats (default: UK6_AGENT_ID or hostname).",

    "  --runner-js=<path>       Đường dẫn tới uk6 runner JS (default: ngay cạnh).",

    "  --once                   Scan 1 lần rồi thoát (không loop).",

    "  --list                   List danh sách agents rồi thoát",

    "  --agent-ttl-ms=<ms>      Agent online TTL cho --list (default: 15000, min: 1000).",

    "  --startup-cleanup=false  Không clean runs/reports/workspaces khi startup (default: true).",

    "  --debug                  In thêm debug logs.",

    "",

  ];

  console.log(lines.join("\n"));

  process.exit(exitCode);

}

