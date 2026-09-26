#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  print '未找到 Node.js。也可以直接在浏览器中打开此文件夹内的 index.html。'
  read '?按回车键退出…'
  exit 1
fi
print '浏览器访问 http://127.0.0.1:4318，按 Ctrl+C 停止服务。'
node serve.mjs
if [[ $? -ne 0 ]]; then
  print '若提示端口被占用，请直接访问 http://127.0.0.1:4318。'
  read '?按回车键退出…'
fi
