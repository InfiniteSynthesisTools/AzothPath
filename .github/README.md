# GitHub Actions 工作流

本项目包含多个GitHub Actions工作流，用于自动化构建、测试和发布。

## 工作流说明

### 1. CI/CD Pipeline (`ci.yml`)

**触发条件：**
- 推送到 `main` 或 `develop` 分支
- 创建 Pull Request 到 `main` 分支
- 手动触发

**功能：**
- 安装依赖
- 构建前端和后端
- 创建生产环境构建包
- 生成部署档案

### 2. NPM Build (`npm-build.yml`)

**触发条件：**
- 推送到 `main` 或 `develop` 分支
- 创建 Pull Request 到 `main` 分支
- 手动触发

**功能：**
- 使用 `npm run build` 构建项目
- 创建部署结构
- 生成启动脚本
- 上传构建产物

### 3. Release Build (`release.yml`)

**触发条件：**
- 推送标签（如 `v1.0.0`）
- 手动触发（需要指定版本）

**功能：**
- 创建发布包
- 生成部署文档
- 创建 GitHub Release
- 上传发布档案

## 使用方法

### 本地开发

```bash
# 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 构建项目
cd backend && npm run build
cd ../frontend && npm run build
```

### 自动构建

1. **推送代码**：推送到 `main` 或 `develop` 分支会自动触发构建
2. **创建PR**：创建 Pull Request 会触发测试构建
3. **手动触发**：在 GitHub Actions 页面可以手动触发工作流

### 发布版本

1. **创建标签**：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **手动发布**：
   - 进入 GitHub Actions 页面
   - 选择 "Release Build" 工作流
   - 点击 "Run workflow"
   - 输入版本号

## 构建产物

### CI/CD Pipeline 产物

- `azoth-path-production/` - 生产环境构建
- `azoth-path-deployment.tar.gz` - 部署档案

### NPM Build 产物

- `azoth-path-build/` - 构建产物
- `azoth-path-release.tar.gz` - 发布档案

### Release 产物

- `azoth-path-release.tar.gz` - Linux/macOS 发布包
- `azoth-path-release.zip` - Windows 发布包
- GitHub Release 页面

## 部署说明

### 生产环境部署

1. **下载构建产物**：
   ```bash
   # 从 GitHub Actions 下载构建产物
   wget <artifact-url>
   tar -xzf azoth-path-deployment.tar.gz
   ```

2. **安装依赖**：
   ```bash
   cd azoth-path-deployment
   npm run install-deps
   ```

3. **启动服务**：
   ```bash
   ./start.sh
   ```

### 环境变量

创建 `.env` 文件：
```env
JWT_SECRET=your-secret-key
PORT=19198
NODE_ENV=production
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

## 自定义配置

### 修改构建脚本

编辑 `package.json` 中的构建脚本：
```json
{
  "scripts": {
    "build": "your-custom-build-command"
  }
}
```

### 添加环境变量

在 GitHub Actions 中添加环境变量：
```yaml
env:
  CUSTOM_VAR: ${{ secrets.CUSTOM_VAR }}
```

### 修改触发条件

编辑工作流文件的 `on` 部分：
```yaml
on:
  push:
    branches: [ main, develop, feature/* ]
  schedule:
    - cron: '0 0 * * *'  # 每天午夜运行
```

## 监控和日志

- **构建状态**：在 GitHub Actions 页面查看构建状态
- **构建日志**：点击具体的构建任务查看详细日志
- **产物下载**：在构建完成后下载构建产物

## 最佳实践

1. **分支管理**：使用 `main` 分支作为生产分支
2. **标签管理**：使用语义化版本标签（如 `v1.0.0`）
3. **依赖管理**：定期更新依赖版本
4. **安全扫描**：定期进行安全扫描
5. **性能监控**：监控构建时间和资源使用
