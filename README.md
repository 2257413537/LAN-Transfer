# LAN Transfer

> 局域网内多设备间快速传输文件和消息的轻量级工具——无需互联网，无需安装客户端，打开浏览器即用。支持打包为独立桌面应用。

## 快速上手

### 环境要求

- Python 3.10+

### 安装

```bash
# 克隆仓库
git clone https://github.com/<your-username>/lan-transfer.git
cd lan-transfer

# 安装依赖
pip install -r requirements.txt
```

### 启动

```bash
python server.py
```

启动后终端会显示局域网地址（如 `http://192.168.1.100:8080`），在同一局域网内的任意设备浏览器中打开该地址即可使用。手机端可通过扫描页面上的二维码快速连接。

### 桌面应用模式

除了浏览器模式，还可以启动为原生桌面窗口：

```bash
python desktop.py
```

桌面模式会打开一个独立窗口（基于系统 WebView），同时保持局域网内其他设备通过浏览器访问的能力。

### 打包为 exe

将应用打包为单个可执行文件，方便分发给没有 Python 环境的用户：

```bash
# 一键打包（首次会自动生成图标）
build.bat
```

打包完成后，可执行文件位于 `dist/LAN Transfer.exe`。双击即可运行，无需安装 Python 或任何依赖。

## 功能特性

- **多设备互联** — 支持 Windows、Android、iPad 等任意设备通过浏览器接入
- **实时消息** — 文本消息与文件传输实时推送，基于 WebSocket
- **QR 码连接** — 一键生成二维码，手机扫码即可加入
- **文件管理** — 按日期日历视图浏览，支持按类型筛选
- **批量操作** — 多选后一键复制、批量下载、批量删除
- **Emoji 支持** — 内置 Emoji 选择器，消息更生动
- **全文搜索** — 快速检索历史消息和文件
- **桌面应用** — 支持打包为独立 exe，原生窗口体验，无需浏览器
- **零配置** — 自动检测局域网 IP，无需手动填写地址
- **无需安装客户端** — 任何现代浏览器均可使用

## 项目结构

```
.
├── desktop.py          # 桌面应用入口（pywebview）
├── server.py           # 后端服务（aiohttp + WebSocket）
├── build.bat           # 一键打包脚本
├── generate_icon.py    # 应用图标生成工具
├── requirements.txt    # Python 依赖
├── public/
│   ├── index.html      # 前端页面
│   ├── app.ico         # 应用图标
│   ├── app.js          # 前端逻辑
│   └── style.css       # 样式
└── data/               # 运行时数据（设备列表、消息记录）
```

## 技术栈

- **后端**: Python / aiohttp / WebSocket / pywebview
- **前端**: 原生 HTML + CSS + JavaScript
- **打包**: PyInstaller
- **图标**: Material Icons Round

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交 PR

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m "feat: add your feature"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 风格：

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整（不影响逻辑）
- `refactor:` 重构

### 测试要求

- 提交前确保 `python server.py` 能正常启动
- 新功能请在 PR 描述中说明测试步骤
- 如修复 Bug，请描述复现方法和修复方案

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
