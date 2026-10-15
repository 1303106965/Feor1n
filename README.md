# Feor1n · 恋爱记录站

自托管的情侣私密小站：**照片时间轴 + 纪念日倒计时 + 相伴计时**，手机优先，PWA 可添加到主屏幕。基于开源项目 [keeleycenc/cc-our-story](https://github.com/keeleycenc/cc-our-story)（MIT）定制：**访客侧前端已整体重写为 Vite + React**，后端沿用其 ASP.NET Core 服务与数据层，现有数据零迁移。

## 架构

```
frontend/                 React SPA（Vite 6 + React 18 + TypeScript + Tailwind CSS v4）
  └─ 构建产物 → src/OurStory.Web/wwwroot/spa/（已提交，服务器无需 node）
src/OurStory.Web/Api/     JSON API（bootstrap / moments / anniversaries / auth / antiforgery）
src/OurStory.Web/Areas/   后台管理（Razor，保留上游实现）
src/OurStory.Services/    业务服务（上游，未改动）
src/OurStory.Data/        EF Core + SQLite（上游，未改动）
```

生产部署是**单进程**：ASP.NET Core 同时服务 SPA 静态文件、JSON API 和后台页面，Docker 部署方式与上游一致。

## 功能一览

| 模块 | 说明 |
| --- | --- |
| 首页（React） | 电影式首页：海报首屏（年份/名字/短句/沉浸大图）→ 按时间正序的章节场景（01–0N 对应每条点滴）→ TODAY 黑场收尾（相伴计时 + 下一个纪念日） |
| 点点滴滴（React） | 编辑式档案索引（发丝线条目、悬停浮现封面）、杂志文章排版（首字下沉、收窄正文）、图片 Lightbox（滑动切换）、留言、上锁记录密码解锁 |
| 纪念日（React） | 数字统计、竖向时间轴、倒计时、公历/农历极简月历、纪念日故事页 |
| 相册（React） | 编辑式马赛克影集：按年份分组、错落跨列网格、遮罩渐入与悬停字幕动画、全屏灯箱（入场缩放/左右滑动切换/图注/跳回章节） |
| 登录（React） | 画廊式登录框架，登录后直达后台，防伪令牌 + Cookie 会话 |
| 后台（Razor） | 传图、写记录、管纪念日、改站点设置、账号口令、通知——功能与上游一致 |
| 手机优先 | 极简底部导航、响应式布局、深色模式（与后台共用配色开关）、PWA（添加到主屏幕 + Web Push） |

## 设计系统

「一部关于两个人的电影 / 一本高级摄影杂志」——不是情侣模板网站。

- **色彩**：画廊白 `#f4f1ec` / 近黑 `#16130f` / 暖灰 / 唯一点缀暗红（oxblood）`#7d2a24`，只出现在线条、编号与眉标上；深色模式为炭黑纸底
- **字体**：展示衬线 Cormorant Garamond + 中文宋体系（Songti/Noto Serif）+ 正文 Inter + 中文黑体；元信息用等宽字体宽字距大写（`01 / EST. 2024 / CHAPTER 01 OF 06`），全部自托管（约 230KB）
- **构图**：全出血章节、12 列不对称网格、图片与文字错位穿插、竖向章节标签、ghost 大编号、发丝线分隔——无圆角卡片、无爱心、无渐变糖果色
- **动效**：Lenis 平滑滚动、IntersectionObserver 渐入与 Mask Reveal、图片 Ken Burns 慢缩放与视差、路由切换淡入、顶部 1px 阅读进度线；全部尊重 `prefers-reduced-motion`
- 首页章节自动由「点滴」记录生成（按时间正序），标题/配图/日期/地点直接取自记录本身；相册同样自动汇总所有点滴里的照片

## 本地开发

需要 [.NET SDK 10](https://dotnet.microsoft.com/download) 和 Node.js 20+。

```bash
# 终端 1：后端（http://localhost:5080）
dotnet run --project src/OurStory.Web

# 终端 2：前端热更新开发服务器（http://localhost:5173，自动代理 /api /uploads /media 到 5080）
cd frontend && npm install && npm run dev
```

打开 <http://localhost:5173> 调试。首次启动自动建库并创建 `boy` / `girl` 两个账号，**随机口令只打印在后端启动日志里一次**（搜「初始口令」）。

前端改完要发布：`cd frontend && npm run build`（产物直接输出到 `src/OurStory.Web/wwwroot/spa/`，把变更提交即可——生产环境不依赖 node）。

## 部署到服务器

### 方式一：Docker（推荐）

```bash
cp .env.example .env      # 按需改 HTTP_PORT，默认 8080
docker compose up -d --build
docker compose logs web   # 找两个账号的初始口令
```

数据都在 `ourstory_data` 卷里，升级/迁移不丢：

```bash
git pull
docker compose up -d --build          # 升级（数据不受影响）

# 备份数据卷（卷名带 compose 项目前缀，用 grep 拿真实名字更稳）
docker run --rm -v "$(docker volume ls -q | grep ourstory_data | head -1):/data" -v "$(pwd):/backup" alpine \
  tar czf /backup/ourstory-data.tgz -C /data .
```

### 方式二：发布包 + systemd

```bash
dotnet publish src/OurStory.Web -c Release -o dist
# 或自包含：dotnet publish src/OurStory.Web -c Release -r linux-x64 --self-contained true -o dist
```

完整步骤见 [UPSTREAM.md](UPSTREAM.md)「远端部署」（注意 `OURSTORY_DATA_DIR` 用绝对路径）。

### Nginx 反代（配好证书后通知功能才可用）

```nginx
server {
    listen 80;
    server_name love.example.com;

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

`X-Forwarded-For` 必须转发（访客指纹依赖它）。HTTPS 证书可用 certbot / acme.sh 申请。

## 部署后第一次要做的事

1. 登录 `/admin`，到「账号」改掉初始口令（两个账号都要）
2. 「站点设置」→ 两个人：填男主/女主名字、**在一起的时间**、个性短句（改名字后前台 Logo、称呼即时跟随）
3. 「图片」上传照片 → 「点点滴滴」写记录，正文插图、设封面
4. 「纪念日」添加重要日子：在一起、生日、旅行……勾选「每年重复」就会每年倒计时
5. 手机打开站点 → 浏览器菜单「添加到主屏幕」→ 后台「通知」开启推送（需 HTTPS）

> 忘记口令：`docker compose exec web dotnet OurStory.Web.dll --reset-password boy`（详见 UPSTREAM.md「忘记口令」）

## 主要接口

| 接口 | 说明 |
| --- | --- |
| `GET /api/bootstrap` | 站点设置、当前身份、防伪令牌、心动令牌与统计、计数、功能状态 |
| `GET /api/home` | 随机情话、最近 3 条点滴 |
| `GET /api/moments?page=` | 点滴分页列表（封面为 /media 缩略图） |
| `GET/POST /api/moments/{slug}…` | 详情、密码解锁、留言（POST 带 `RequestVerificationToken` 头） |
| `GET /api/anniversaries…` | 总览、时间轴、即将到来、公历/农历月历、故事详情 |
| `GET /api/gallery` | 相册：汇总全部已发布点滴里的照片（封面 + 正文配图），上锁内容仅情侣可见 |
| `POST /api/auth/login` / `logout` / `GET /api/auth/me` | 登录登出与身份 |
| `GET /api/antiforgery` | 防伪令牌下发 |
| `POST /api/heartbeat` | 心动上报（沿用上游，表单提交 + 令牌） |

## 与上游 cc-our-story 的差异

- 访客侧前端整体重写为 **Vite + React + TypeScript + Tailwind** SPA（原 Razor 公开页 Index / Moments / Anniversaries / Login 已移除，`/moments`、`/anniversaries`、`/login` 等路由由 SPA 接管）
- 新增 JSON API 层与防伪校验（JSON 端点手动校验 `IAntiforgery.IsRequestValidAsync`）
- 后台管理、心有灵犀 / 花信如期 / 心意商城保留 Razor 实现（从 SPA 直接跳转，功能无损）
- 品牌 Feor1n（默认值在 `SiteSettings.cs`，Logo 动态读站点标题）、自定义图标、标题文案
- 全站视觉重制为电影感/编辑式设计系统（见上文「设计系统」）：访客侧 SPA 与 Razor 后台共用同一套 token（`--accent*` 等），深色模式同步
- `Directory.Build.props`：ImageSharp 3.1.12 的 NuGet 审计项降级为警告（3.1.x 无修复版，4.x 需 License Key），上游出修复版后随版本号清理
- 上游原文档保留在 [UPSTREAM.md](UPSTREAM.md)（其中「前台 Razor 页面」相关章节已不适用，运维、数据库、通知等章节仍有效）

## 目录结构

```
frontend/src/            SPA 源码（pages/components/lib/context）
src/OurStory.Core       领域模型与配置
src/OurStory.Data       EF Core + SQLite
src/OurStory.Services   业务服务
src/OurStory.Web        ASP.NET Core 站点（Api/ 新接口，Areas/Admin/ 后台，wwwroot/spa/ SPA 产物）
docker/ compose.yaml    Docker 构建与一键部署
UPSTREAM.md             上游项目完整文档（运维细节以它为准）
```

## 许可

上游 [cc-our-story](https://github.com/keeleycenc/cc-our-story) 为 MIT 协议，本项目微调与重写部分沿用 MIT。
