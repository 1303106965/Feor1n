# 访问加速优化清单

> 给服务器运维 AI 的执行文档。按顺序做，每步独立可验证，做完一步验一步。

## 背景现状

站点是 ASP.NET Core（Docker，容器内 8080），前面 Nginx 反代 + HTTPS。图片已经由应用自动压缩成 WebP 并带长缓存头，SPA 静态资源带 hash 文件名。当前瓶颈在 Nginx 默认配置：无 gzip、无 HTTP/2、未充分利用浏览器缓存协商。

## 1. Nginx 开启 gzip 压缩（收益最大）

SPA 的 JS/CSS 未压缩传输，gzip 后体积减 60-70%，首屏加载明显变快。

编辑 `/etc/nginx/conf.d/gzip.conf`（不存在则新建）：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/javascript
    application/javascript
    application/json
    application/xml
    image/svg+xml
    font/woff2;
```

注意：`font/woff2` 本身已压缩，gzip 收益极小，可省；但 `image/svg+xml` 必须在列（相册示例图是 SVG）。

验证：

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -s -H "Accept-Encoding: gzip" -I https://feor1n.com/spa/assets/$(ls /srv/feor1n-data 2>/dev/null; echo) 2>/dev/null || true
# 简单确认：响应头应包含 Content-Encoding: gzip
curl -s -H "Accept-Encoding: gzip" -I https://feor1n.com/ | grep -i "content-encoding"
```

## 2. 确认 HTTP/2 已启用

多图并行加载 HTTP/2 比 HTTP/1.1 快一截，尤其是相册这种一页十几张图的场景。

检查：

```bash
grep -rn "listen 443" /etc/nginx/sites-enabled/
```

如果输出是 `listen 443 ssl;` 而没有 `http2`，改成：

```nginx
listen 443 ssl http2;
```

改完 `nginx -t && systemctl reload nginx`。验证：

```bash
curl -sI --http2 https://feor1n.com/ | head -1
# 应输出 HTTP/2 200
```

## 3. 确认上传上限配置已生效

相册上传单图最大 20MB，Nginx 默认只放 1MB 会直接 413。确认 `/etc/nginx/sites-available/feor1n` 的 server 块里有：

```nginx
client_max_body_size 30m;
```

没有就加上并 reload。

## 4. 静态资源缓存头检查（应用已带，确认 Nginx 没覆盖）

应用对 `/spa/assets/*`（带 hash）已发 `Cache-Control: public, max-age=31536000, immutable`，对 `/uploads/*` 发 `max-age=604800`。Nginx 反代默认会透传这些头，**不要**在 Nginx 里对 `location /` 再额外加 `expires` 指令覆盖它。

确认方式：

```bash
curl -sI https://feor1n.com/manifest.webmanifest | grep -i cache-control
# 应看到 max-age=86400，来自应用
```

如果 Nginx 里有 `expires` 或 `add_header Cache-Control` 与之冲突，删掉。

## 5. 图片存储是 OSS 时：接入 CDN 域名

只有当 `ourstory.json` 里 `Storage.Driver` 配了 OSS 才需要做这步。OSS 直连和 CDN 边缘节点对国内用户延迟差异很大。

1. 在阿里云控制台给 Bucket 挂一个 CDN 加速域名（如 `cdn.feor1n.com`）。
2. 把 `ourstory.json` 中 `Storage.Oss.PublicBaseUrl` 从 Bucket 直连地址改成 CDN 域名。
3. 重启容器：`docker compose -f docker-compose.prod.yml up -d`。

历史图片的 URL 是按 PublicBaseUrl 动态生成的，改完自动切换，无需迁移数据。

纯本地存储（默认部署）跳过这步。

## 6. 应用侧参数微调（可选）

容器内应用已自动生成 480px（相册）/ 720px（封面）/ 1440px（正文预览）三档 WebP。如果带宽依然吃紧，可以在下次发版时把 WebP 质量从默认 75 降到 70（`src/OurStory.Services/Storage/Services/ThumbnailService.cs` 的 `SaveAsWebpAsync`），再省约 15% 体积，视觉几乎无差。需要改代码发版，不急就先不动。

## 7. 最终验证

全部做完后跑一遍：

```bash
# gzip 生效
curl -s -H "Accept-Encoding: gzip" -I https://feor1n.com/ | grep -i "content-encoding"
# HTTP/2 生效
curl -sI --http2 https://feor1n.com/ | head -1
# 派生图可达且带长缓存
curl -sI "https://feor1n.com/media/thumb/ourstory/public/$(date +%Y/%m)/$(ls /srv/feor1n-data/uploads/ourstory/public/$(date +%Y/%m) 2>/dev/null | head -1)" 2>/dev/null | grep -iE "cache-control|content-type" || echo "替换成真实文件路径再测"
# 站点正常
curl -s https://feor1n.com/healthz
```

浏览器端用 DevTools → Network 面板刷新相册页确认：图片请求的 Size 列都是几十 KB 而非几 MB，传输列有 `webp`。

## 回滚

所有改动只涉及 Nginx 配置文件和（可选的）`ourstory.json` 一行。出问题恢复原配置文件后 `systemctl reload nginx` 即可，应用容器和数据不受影响。
