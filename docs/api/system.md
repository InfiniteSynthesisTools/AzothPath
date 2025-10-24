# 系统监控 API

**基础URL：** `http://localhost:19198`  
**模块：** 系统监控

---

## 获取系统信息

### GET /api/system/info

获取系统信息

#### 请求信息
- **方法：** GET
- **路径：** `/api/system/info`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/system/info](http://localhost:19198/api/system/info)

#### 响应示例
```json
{
  "code": 200,
  "message": "获取系统信息成功",
  "data": {
    "cpu": {
      "usage": 0.1,
      "cores": 4,
      "model": "Intel(R) Celeron(R) N5095A @ 2.00GHz"
    },
    "memory": {
      "total": 16295723008,
      "used": 12172926976,
      "free": 4122796032,
      "cached": 0,
      "usage": 74.7
    },
    "disk": {
      "total": 500363689984,
      "used": 26843545600,
      "free": 473520144384,
      "usage": 5,
      "path": "/qy/AzothPath"
    },
    "os": {
      "platform": "linux",
      "version": "4.18.0-553.5.1.el8.x86_64",
      "arch": "x64",
      "hostname": "qingying-peixi"
    },
    "node": {
      "version": "v22.15.0",
      "uptime": 82.081620041
    },
    "uptime": 32.4,
    "startTime": "2025-10-18T05:13:31.546Z"
  }
}
```

#### 响应字段说明
- **CPU信息**: 使用率、核心数、型号
- **内存信息**: 总量、已用、空闲、缓存、使用率
- **磁盘信息**: 总量、已用、空闲、使用率、路径
- **操作系统**: 平台、版本、架构、主机名
- **Node.js**: 版本、运行时间
- **系统运行时间**: 总运行时间、启动时间

---

## 获取数据库备份状态

### GET /api/system/backup/status

获取数据库备份状态

#### 请求信息
- **方法：** GET
- **路径：** `/api/system/backup/status`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/system/backup/status](http://localhost:19198/api/system/backup/status)

#### 响应示例
```json
{
  "code": 200,
  "message": "获取备份状态成功",
  "data": {
    "backups": [
      {
        "name": "azothpath_backup_20251019.db",
        "size": 1024000,
        "sizeFormatted": "1.00 MB",
        "createdAt": "2025-10-19T13:31:20.248Z"
      }
    ]
  }
}
```

---

## 手动触发数据库备份

### POST /api/system/backup/manual

手动触发数据库备份

#### 请求信息
- **方法：** POST
- **路径：** `/api/system/backup/manual`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/system/backup/manual](http://localhost:19198/api/system/backup/manual)

#### 响应示例
```json
{
  "code": 200,
  "message": "备份成功",
  "data": {
    "backupPath": "/qy/AzothPath/database/backups/azothpath_backup_20251019.db",
    "timestamp": "2025-10-19T13:31:20.248Z"
  }
}
```

---

## 获取图缓存状态

### GET /api/system/cache/status

获取图缓存状态

#### 请求信息
- **方法：** GET
- **路径：** `/api/system/cache/status`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/system/cache/status](http://localhost:19198/api/system/cache/status)

#### 响应示例
```json
{
  "code": 200,
  "message": "获取缓存状态成功",
  "data": {
    "hasGraphCache": true,
    "graphCacheAge": 15000,
    "ttl": 3600,
    "graphLastUpdatedFormatted": "2025-10-19T13:31:20.248Z",
    "graphAgeFormatted": "4小时10分钟15秒"
  }
}
```

#### 缓存状态说明
- **hasGraphCache**: 是否存在图缓存
- **graphCacheAge**: 缓存年龄（毫秒）
- **ttl**: 缓存生存时间（秒）
- **graphLastUpdatedFormatted**: 最后更新时间
- **graphAgeFormatted**: 缓存年龄（人类可读格式）

---

## 手动刷新图缓存

### POST /api/system/cache/refresh

手动刷新图缓存

#### 请求信息
- **方法：** POST
- **路径：** `/api/system/cache/refresh`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/system/cache/refresh](http://localhost:19198/api/system/cache/refresh)

#### 响应示例
```json
{
  "code": 200,
  "message": "缓存刷新成功",
  "data": {
    "hasGraphCache": true,
    "graphCacheAge": 0
  }
}
```

---

## 系统监控说明

### 监控指标
- **CPU使用率**: 实时监控CPU负载
- **内存使用率**: 监控内存使用情况
- **磁盘使用率**: 监控磁盘空间使用
- **系统运行时间**: 监控服务稳定性

### 备份管理
- **自动备份**: 系统定期自动备份数据库
- **手动备份**: 支持手动触发备份
- **备份列表**: 查看所有备份文件信息
- **备份大小**: 显示备份文件大小和创建时间

### 缓存管理
- **图缓存**: 合成路径图的缓存机制
- **缓存状态**: 实时查看缓存状态
- **缓存刷新**: 手动刷新缓存数据
- **性能优化**: 通过缓存提升查询性能

### 使用场景
- **运维监控**: 实时监控系统运行状态
- **性能分析**: 分析系统资源使用情况
- **故障排查**: 通过监控数据定位问题
- **容量规划**: 根据使用情况规划资源

---

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [错误处理](../common.md#错误处理)
