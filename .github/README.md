# GitHub Actions 工作流

本项目包含一个GitHub Actions工作流，用于自动化构建和发布。

## 工作流说明

### Build Release (`release.yml`)

**触发条件：**
- 推送到 `main` 或 `develop` 分支
- 手动触发

**功能：**
- 使用 `npm install` 安装依赖（无需锁定文件）
- 使用 `npm run build` 构建前端和后端
- 创建发布包
- 生成启动脚本
- 创建 GitHub Release
- 上传发布档案

## 使用方法

### 自动构建

每次推送到 `main` 或 `develop` 分支都会自动触发构建：

```bash
git push origin main
# 或
git push origin develop
```

### 手动触发构建

- 进入 GitHub Actions 页面
- 选择 "Build Release" 工作流
- 点击 "Run workflow"

## 构建产物

### Release 产物

- `azoth-path-release.tar.gz` - Linux/macOS 发布包（扁平结构）
- `azoth-path-release.zip` - Windows 发布包（扁平结构）
- GitHub Release 页面

## 部署说明

### 生产环境部署

1. **下载发布包**：
   - 从 GitHub Release 页面下载
   - 或从 GitHub Actions 下载构建产物

2. **解压并启动**：
   ```bash
   # Linux/macOS
   tar -xzf azoth-path-release.tar.gz
   ./start.sh
   
   # Windows
   unzip azoth-path-release.zip
   start.sh
   ```

### 访问地址

- 前端：http://localhost:19198
- API：http://localhost:19198/api
- 健康检查：http://localhost:19198/api/health

## 故障排查

### 构建失败

1. **检查 Node.js 版本**：确保使用 Node.js 18+
2. **检查依赖**：确保所有依赖正确安装
3. **检查构建脚本**：确保 `package.json` 中的构建脚本正确

### 部署问题

1. **端口占用**：检查端口 19198 是否被占用
2. **权限问题**：确保启动脚本有执行权限
3. **数据库问题**：检查数据库文件权限
