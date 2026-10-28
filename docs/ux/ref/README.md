# docs/ux/ref · 视觉基准与取证记录

本目录是群聊原型/规格的**视觉基准证据**，用于证明设计没有发明样式，而是复刻 DSH 本体。

## 文件

| 文件 | 来源 | 说明 |
| --- | --- | --- |
| `00-dsh-conversation-real.webp` | DSH Desktop 真实窗口（会话「协议委派模式」）1280×800 | 当前对话页整体：左侧栏、会话头 + 视图 tab 行、消息流、输入卡、底部状态行 |
| `01-view-tabs-zoom.png` | 上图的 tab 行区域，4× 放大 | 用于核对 tab 字号/间距/激活态下划线/颜色 |
| `02-header-zoom.png` | 上图的会话头区域，4× 放大 | 会话标题、徽标、右侧工具栏 |
| `03-composer-zoom.png` | 上图的输入卡区域，2× 放大 | 占位文案、工具行、发送键 |
| `04-message-area.png` | 上图的消息流区域，2× 放大 | 消息字号、行高、间距、时间戳位置 |

## 取证方式

1. **真实窗口截图**：通过 macOS 辅助功能接口抓取 DSH Desktop 前台窗口（`get_app_state`），并裁剪关键区域。
2. **真实样式抽取**：本机 Web GUI `http://127.0.0.1:62300` 需要 DSH Desktop 打印的鉴权 URL，直接访问返回
   `dsh web authentication required`（401），Playwright 无法自行登录，故**弃用 Web 截图**；
   改为从安装包 `Contents/Resources/app.asar` 抽取真实样式与令牌（只读解析），得到精确数值：

| 证据 | 值 |
| --- | --- |
| 视图 tab | `font-size 13px / font-weight 500 / line-height 16px / padding 0 0 9px`，`gap 32px`，激活 `--dsw-alias-state-business-primary` + 2px 下划线（`border-radius 2px`，`bottom:-1px`） |
| 会话头 | `min-height 76px / padding 10px 28px 0 20px / border-bottom .5px --dsw-alias-border-l3` |
| tab 行容器 | `margin-top 10px / padding-left 8px / min-height 25px` |
| 内容列 | `--dsh-chat-content-width: clamp(680px, 64%, 920px)`；输入卡 `max-width = 列宽 + 32` |
| 用户气泡 | `--dsw-specific-bubble`，`border-radius 20px`，`padding 10px 16px`，`max-width: min(列宽*0.702, 82%)` |
| 输入卡 | `border-radius 28px`（`--dsw-radius-panel`），`--dsw-specific-input-major`，14px 正文 |
| 圆角阶 | `xs 4 / sm 8 / md 12 / lg 16 / xl 20 / panel 28` |
| 字体栈 | `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", …`；等宽 `"SF Mono", "JetBrains Mono", "Fira Code", …` |
| 主题令牌 | 37 个 `--dsw-alias-*` / `--dsw-specific-*` 的 light/dark 双值，已写入 Figma 变量集 `DSH Theme` / `DSH Theme · Light` |

来源包（只读）：`@deepseek-ai/dsh-client-ui-theme`（`design-platform.css`、`base.css`、`focus.css`、`gradient-shadow-text.css`）、
`@deepseek-ai/dsh-client-ui-conversation`（会话头 / tabs / composer CSS）。

> 结论：Figma 原型中的所有颜色、字号、圆角、间距都能追溯到上述真实值；无自造品牌色。
