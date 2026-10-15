# Feor1n 部署文档

> 目标环境：腾讯云 Linux 服务器  
> 域名：`feor1n.com`（可同时使用 `www.feor1n.com`）  
> 部署方式：Docker Compose + Nginx + HTTPS  
> 本文档可以直接交给服务器上的 AI 执行。

## 1. 部署目标

最终访问效果：

- `https://feor1n.com/`：前台站点
- `https://feor1n.com/login`：登录页
- `https://feor1n.com/admin`：后台管理
- `https://feor1n.com/healthz`：健康检查，返回 `ok`

应用由 ASP.NET Core 单进程提供服务，同时托管 React SPA、JSON API、Razor 后台和静态图片。

## 2. 服务器前置条件

服务器需满足：

- Ubuntu 22.04 或 24.04
- 已安装 Docker 和 Docker Compose v2
- 已安装 Nginx（可稍后安装）
- 公网 IP 已解析到 `feor1n.com`

腾讯云控制台需要做：

1. 安全组放行 `22`、`80`、`443`。
2. DNS 添加 A 记录：`feor1n.com` 和 `www.feor1n.com` 指向服务器公网 IP。
3. 若服务器在中国大陆，域名需先完成 ICP 备案。

安装 Docker 的参考命令：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

## 3. 上传项目到服务器

本项目不依赖服务器上的 Node.js。`src/OurStory.Web/wwwroot/spa/` 已经是构建好的前端产物。

建议把整个项目传到：

```text
/opt/feor1n
```

示例：

```bash
sudo mkdir -p /opt/feor1n
sudo chown -R "$USER":"$USER" /opt/feor1n
```

然后上传项目内容到 `/opt/feor1n`，确保目录里能看到：

```text
src/
frontend/
docker/
docker-compose.prod.yml
DEPLOYMENT.md
```

如果服务器 AI 修改了 `frontend/src`，必须在本地执行完前端构建后再上传：

```bash
cd /opt/feor1n/frontend
npm install
npm run build
```

生产 Docker 镜像不会执行前端构建。

## 4. 首次配置

创建数据目录：

```bash
sudo mkdir -p /srv/feor1n-data
```

写入首次启动配置，设置登录口令：

```bash
sudo tee /srv/feor1n-data/ourstory.json > /dev/null <<'EOF'
{
  "Site": {
    "DatabaseFileName": "ourstory.db",
    "TimeZone": "Asia/Shanghai",
    "Seed": {
      "BoyUserName": "boy",
      "BoyPassword": "0912",
      "GirlUserName": "girl",
      "GirlPassword": "0912"
    }
  },
  "Storage": {
    "EnableImageOptimization": true
  }
}
EOF
```

当前前端登录页固定使用 `boy` 账号，只需要输入口令 `0912`。

容器内应用用户 UID 为 `1654`，需要让数据目录可写：

```bash
sudo chown -R 1654:1654 /srv/feor1n-data
```

## 5. 启动服务

```bash
cd /opt/feor1n
docker compose -f docker-compose.prod.yml up -d --build
```

检查状态：

```bash
docker compose -f docker-compose.prod.yml ps
curl http://127.0.0.1:8080/healthz
```

期望返回：

```text
ok
```

查看日志：

```bash
docker compose -f docker-compose.prod.yml logs -f web
```

## 6. Nginx 反代与 HTTPS

安装 Nginx：

```bash
sudo apt-get update
sudo apt-get install -y nginx
```

写入站点配置：

```bash
sudo tee /etc/nginx/sites-available/feor1n > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name feor1n.com www.feor1n.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
    }
}
EOF
```

启用配置：

```bash
sudo ln -sf /etc/nginx/sites-available/feor1n /etc/nginx/sites-enabled/feor1n
sudo nginx -t
sudo systemctl reload nginx
```

`X-Forwarded-For` 必须保留，访客统计依赖它。

签发 HTTPS 证书：

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d feor1n.com -d www.feor1n.com
```

## 7. 上线验证

```bash
curl -I https://feor1n.com/
curl https://feor1n.com/healthz
```

打开后台：

```text
https://feor1n.com/login
```

口令：

```text
0912
```

登录后建议做以下操作：

1. 到「站点设置」填写站名、双方名字、在一起时间。
2. 到「图片」上传测试图片。
3. 到「点点滴滴」创建一条记录并设置封面。
4. 到「纪念日」确认「她的生日 · 农历九月十二」和「在一起的纪念日」日期正确。
5. 到「通知」测试 Web Push（需要 HTTPS）。

## 8. 图片和数据管理

数据目录固定为：

```text
/srv/feor1n-data
```

其中：

```text
/srv/feor1n-data/ourstory.db     SQLite 数据库
/srv/feor1n-data/ourstory.json   站点配置
/srv/feor1n-data/uploads/        原图
/srv/feor1n-data/thumbs/         自动生成的 WebP 缩略图
/srv/feor1n-data/keys/           数据保护密钥
```

图片上传入口：

```text
后台 → 图片
```

图片被文章、纪念日、商城、留言或设置引用时，后台删除会先提示引用关系，不会直接误删。

当前配置已开启图片优化（`Storage.EnableImageOptimization=true`）：列表、封面、相册网格使用轻量 WebP 预览图；点开灯箱或查看详情时仍加载原始图片，原图不会被覆盖或删除。

完整备份：

```bash
sudo mkdir -p /srv/backups
sudo tar czf /srv/backups/feor1n-$(date +%F-%H%M).tgz -C /srv feor1n-data
```

如果后期要使用腾讯云 COS，可以：

- 继续使用本地磁盘，只把备份文件同步到 COS；
- 或将 `uploads/` 定期同步到 COS；
- 或在现有 `IFileStorage` 架构上新增腾讯云 COS 驱动。

## 8.1 图片较多时的加速建议

如果未来图片数量较多，按下面顺序处理：

1. 保持当前预览图机制：网格、列表、封面使用 WebP 预览图，原图只在灯箱中加载。
2. 给静态资源配置 CDN：
   - `/spa/assets/*`：缓存 30 天。
   - `/media/*`：缓存 7 天。
   - `/uploads/*`：按需缓存，通常 7 天。
3. 在腾讯云 CDN 中设置回源地址为 `https://feor1n.com`，并缓存图片、JS、CSS、字体。
4. 图片量大后，把 `/srv/feor1n-data/uploads` 同步到腾讯云 COS，再让 CDN 直接回源 COS。

如果继续使用本机磁盘，建议把数据目录放在系统盘之外的数据盘上，并定期清理不再引用的原图。

## 9. 升级项目

上传新代码后重新构建：

```bash
cd /opt/feor1n
docker compose -f docker-compose.prod.yml up -d --build
```

数据库迁移会在启动时自动执行，不需要手工跑迁移。

## 10. 迁移本地已有数据

如果要把本地已有内容一起上线，从本地打包 `App_Data`：

```bash
cd /path/to/Feor1n
tar czf feor1n-data.tgz -C src/OurStory.Web App_Data
```

上传到服务器后，先确保服务已停止：

```bash
cd /opt/feor1n
docker compose -f docker-compose.prod.yml down
```

解压到数据目录：

```bash
sudo rm -rf /srv/feor1n-data
sudo mkdir -p /srv/feor1n-data
sudo tar xzf feor1n-data.tgz -C /srv/feor1n-data --strip-components=1
sudo chown -R 1654:1654 /srv/feor1n-data
```

再启动：

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

## 11. 常见问题

- 健康检查失败：先看 `docker compose logs web`，通常是数据目录权限问题。
- 图片 404：确认 `/srv/feor1n-data/uploads` 存在且 UID 为 `1654`。
- 通知不可用：确认域名已经走 HTTPS，并检查 `ourstory.json` 中的 `Push` 密钥未被改动。
- 修改口令：当前部署使用 `0912`，在首次启动前修改 `ourstory.json` 即可。
