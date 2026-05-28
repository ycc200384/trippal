# TripPal iOS App 设置指南

## 你需要做的（3 步，10 分钟）

### 第 1 步：获取 Apple Team ID

1. 打开 https://developer.apple.com/account
2. 用你的 Apple ID 登录
3. 页面顶部会显示你的 Team ID（一串字母数字，如 `ABC123XYZ`）
4. 记下这个 Team ID

### 第 2 步：创建 GitHub 仓库并推送代码

1. 去 https://github.com/new 创建新仓库，名字随便（如 `trippal`）
2. 在 TripPal 目录下打开终端，运行：

```bash
git init
git add .
git commit -m "TripPal iOS App"
git remote add origin https://github.com/你的用户名/trippal.git
git push -u origin main
```

### 第 3 步：配置 GitHub Secrets

1. 进入你的 GitHub 仓库 → Settings → Secrets and variables → Actions
2. 点 "New repository secret"，添加一个 Secret：
   - Name：`APPLE_TEAM_ID`
   - Value：你第 1 步记下的 Team ID

### 完事

现在每次你 `git push`，GitHub Actions 会自动在云端 Mac 上构建 iOS App。构建完成后去仓库的 Actions 页面下载 `.ipa` 文件。

### 安装到 iPhone

1. iPhone 上去 https://altstore.io 下载 AltStore
2. 用数据线连电脑，AltStore 装上 iPhone（只需一次）
3. 下载 GitHub Actions 产出的 `.ipa`
4. 在 iPhone 上通过 AltStore 打开 `.ipa` → 安装

---

## 构建流程

```
你 push 代码 → GitHub Actions（云端 Mac 编译 15 分钟）→ 产出 .ipa → 你下载 → AltStore 安装
```
