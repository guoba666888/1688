# 剧集模拟器 - 详细部署指南

## 架构说明

- **前端**：单文件 HTML（剧集模拟器主页面）
- **后端**：Serverless API（激活码验证、状态查询、批量生成）
- **数据库**：Upstash Redis（免费版）
- **激活码验证**：一码一设备绑定，月卡30天/年卡365天，支持时长叠加

---

## 关于你之前用过的部署平台

你之前橙果漫剧项目用过 **Vercel** 和 **Netlify**，这两个平台**都可以同时部署这个项目**，互不冲突：

| 平台 | 能否部署 | 说明 |
|------|---------|------|
| **Cloudflare Pages** ✅ 推荐 | 可以 | Functions 原生支持，免费无广告，国内访问最稳 |
| **Vercel** | 可以 | 需要把 functions 目录改名为 `api`，格式微调 |
| **Netlify** | 可以 | 需要改成 Netlify Functions 格式，免费版有右下角广告 |

**建议**：用 Cloudflare Pages 部署这个新项目，和你之前的 Vercel/Netlify 项目完全独立，同一个邮箱账号可以创建无限个项目，不会互相影响。

---

## 第一步：注册/登录 Upstash 并创建数据库

### 1.1 登录账号
1. 打开 [https://upstash.com](https://upstash.com)
2. 登录你的账号（新注册一个账号也可以，免费）

### 1.2 创建数据库
1. 登录后，点击 **Create Database**
2. 填写配置：
   - **Name**：填 `drama-simulator`（跟其他项目区分开）
   - **Region**：选 **Singapore**（新加坡，离国内最近，延迟最低）
   - **Type**：选 **Regional**
3. 点击 **Create**

### 1.3 获取连接信息
创建成功后，在数据库详情页往下滑，找到 **REST API** 区域，复制两个值：
- **UPSTASH_REDIS_REST_URL**：类似 `https://xxx-xxx.upstash.io`
- **UPSTASH_REDIS_REST_TOKEN**：一长串字符（点击眼睛图标显示）

> 把这两个值记到记事本里，后面要用。
>
> 免费版限制：每日 10,000 次请求，256MB 存储，个人使用完全足够。

---

## 第二步：准备部署文件

### 2.1 解压部署包
把 `剧集模拟器-部署包.zip` 解压到一个文件夹，解压后结构如下：

```
剧集模拟器-部署包/
├── admin.html              ← 激活码管理后台（已有）
├── README.md               ← 本说明文档
└── functions/
    └── api/
        ├── status.js       ← 查询会员状态（已有）
        ├── activate.js     ← 激活码验证（已有）
        └── admin/
            └── generate.js ← 批量生成激活码（已有）
```

### 2.2 获取前端 index.html
部署包里还缺一个 `index.html`（前端主页面），需要从当前应用导出：

1. 在电脑浏览器（Chrome/Edge）中打开剧集模拟器应用
2. 在页面**空白处**右键 → 选择 **另存为**（或按 Ctrl+S）
3. 保存类型选 **网页，仅HTML (*.htm;*.html)**
4. 文件名改为 `index.html`
5. 保存到解压后的 `剧集模拟器-部署包` 文件夹里

> ⚠️ 注意：一定要选「网页，仅HTML」，不要选「网页，全部」，否则会多出一个文件夹。
>
> 保存后确认文件夹里有 `index.html` 文件，大小应该有几十KB到几百KB。

### 2.3 最终文件结构确认
完成后，文件夹里应该是这样：

```
剧集模拟器-部署包/
├── index.html              ← 刚保存的前端页面
├── admin.html              ← 管理后台
├── README.md
└── functions/
    └── api/
        ├── status.js
        ├── activate.js
        └── admin/
            └── generate.js
```

---

## 第三步：部署到 Cloudflare Pages

### 3.1 登录 Cloudflare
1. 打开 [https://pages.cloudflare.com](https://pages.cloudflare.com)
2. 用 Cloudflare 账号登录（没有就注册一个，免费）

### 3.2 创建项目
1. 点击 **Create a project**
2. 选择 **Upload assets**（直接上传文件，不用连 GitHub）

### 3.3 上传文件
1. **Project name**：填一个项目名，比如 `drama-simulator`（这个会成为你的访问域名前缀）
2. 打开解压后的 `剧集模拟器-部署包` 文件夹
3. **全选里面的所有文件和文件夹**（index.html、admin.html、functions文件夹），拖到网页的上传区域
4. 等待上传完成，点击 **Deploy site**
5. 部署大约需要 1-2 分钟，看到成功页面就完成了

> 部署成功后会得到一个地址：`https://你的项目名.pages.dev`
>
> 比如项目名叫 drama-simulator，地址就是 `https://drama-simulator.pages.dev`

---

## 第四步：配置环境变量（关键！）

刚部署完还不能用，需要配置数据库连接信息。

### 4.1 进入设置
1. 在项目页面，点击顶部的 **Settings**
2. 左侧菜单选 **Environment variables**

### 4.2 添加变量
在 **Production** 区域，点击 **Add variable**，依次添加以下 3 个：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `UPSTASH_REDIS_REST_URL` | 第一步从 Upstash 复制的 URL | 数据库地址 |
| `UPSTASH_REDIS_REST_TOKEN` | 第一步从 Upstash 复制的 Token | 数据库密码 |
| `ADMIN_PASSWORD` | 自己设一个密码，比如 `mima123456` | 管理后台登录密码 |

> 每个变量填完点 **Add** 确认，3 个都加完后点 **Save**。

### 4.3 重新部署（使环境变量生效）
1. 点击顶部 **Deployments**
2. 找到最新的一次部署，点击右侧的 **⋯** 更多按钮
3. 选择 **Retry deployment**
4. 等待重新部署完成（1-2分钟）

> ⚠️ 这一步很重要！环境变量添加后必须重新部署才能生效。

---

## 第五步：生成激活码

### 5.1 打开管理后台
在浏览器访问：`https://你的项目名.pages.dev/admin.html`

### 5.2 生成激活码
1. **管理员密码**：输入你第四步设置的 `ADMIN_PASSWORD`
2. **类型**：选「月卡（30天）」或「年卡（365天）」
3. **数量**：填要生成多少个，比如 10
4. **前缀**：可以留空（默认月卡 MONTH 开头，年卡 YEAR 开头），也可以自定义
5. 点击 **生成激活码**
6. 生成的码会显示在下方，点击任意一个码即可复制

### 5.3 测试激活
1. 打开 `https://你的项目名.pages.dev`（主页面）
2. 点顶部的「未激活」徽标，输入一个刚生成的激活码
3. 提示激活成功，顶部显示剩余天数
4. 点第4集以后的剧集，不再提示需要激活

---

## 第六步：手机/iPad 使用

### 方式一：直接浏览器打开
- 手机 Safari / Chrome 直接访问 `https://你的项目名.pages.dev`
- 支持苹果和安卓，自适应屏幕

### 方式二：添加到主屏幕（推荐，像原生App）
**iPhone/iPad（Safari）：**
1. Safari 打开网站
2. 点底部分享按钮（方框+向上箭头）
3. 选「添加到主屏幕」
4. 点右上角「添加」
5. 桌面会出现「剧集模拟器」图标，点开全屏使用

**安卓（Chrome）：**
1. Chrome 打开网站
2. 点右上角 ⋮ 菜单
3. 选「添加到主屏幕」或「安装应用」
4. 确认添加

---

## 常见问题排查

### Q: 打开网站提示网络错误/激活失败？
A: 检查以下几点：
1. Upstash 的 REST URL 和 Token 是否填对（注意不要多复制空格）
2. 环境变量添加后是否重新部署了（必须 Retry deployment）
3. Upstash 数据库是否正常（登录 Upstash 控制台看数据库状态）

### Q: 国内访问慢或打不开？
A: Cloudflare Pages 国内大部分地区可直连，偶尔抽风。如果持续打不开，可以：
- 换个网络试试（手机流量 vs WiFi）
- 考虑绑定自己的域名（Cloudflare 支持自定义域名）

### Q: 一个激活码能给多个人用吗？
A: 不能。一码一设备，第一个激活的设备会绑定，其他设备用同一个码会提示「已被其他设备使用」。

### Q: 怎么解绑/重置某个激活码？
A: 登录 [Upstash 控制台](https://upstash.com)：
1. 进入数据库，点 **CLI** 标签
2. 输入命令查看所有激活码：`keys code:*`
3. 找到要重置的码，输入：`hset code:激活码 used false`
4. 再输入：`hset code:激活码 deviceId ""`
5. 这个码就可以重新使用了

### Q: 月卡没到期再激活年卡，时间怎么算？
A: 叠加。从当前到期时间往后顺延 365 天，不会浪费剩余天数。

### Q: 换手机了怎么办？
A: 换手机/清浏览器缓存会生成新的设备ID，需要用新的激活码。老设备上的时间不会转移。

### Q: 怎么更新前端页面？
A: 后续如果改了前端，重新保存 index.html，到 Cloudflare Pages → Create a project → Upload assets，覆盖上传即可。functions 文件夹不用动。

### Q: 管理后台地址是什么？
A: `https://你的项目名.pages.dev/admin.html`，别把这个地址公开给普通用户。

---

## 用 Vercel 部署（备选方案）

如果你更想用 Vercel（你之前用过），需要做以下调整：

1. 把 `functions/api/` 目录改名为 `api/`，放到项目根目录
2. 每个 js 文件的导出函数名改为 `export default function handler(req, res)`
3. Upstash 环境变量在 Vercel 项目 Settings → Environment Variables 里配置
4. 部署后地址类似 `https://xxx.vercel.app`

> Vercel 国内访问不太稳定，安卓端可能连不上，还是推荐 Cloudflare Pages。

---

## 用 Netlify 部署（备选方案）

1. 把 `functions/api/` 改名为 `netlify/functions/`
2. 函数格式需要适配 Netlify 的 `exports.handler = async (event, context) => {}`
3. 环境变量在 Site settings → Environment variables 配置
4. Netlify 免费版右下角有「Powered by Netlify」广告，不推荐

---

## 技术支持

部署过程中遇到问题，把报错截图发给我，我帮你排查。
