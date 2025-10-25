# 系统健康检查 API

**基础URL：** `http://localhost:19198`  
**模块：** 系统健康检查

---

## GET /api/health

获取服务器健康状态

### 请求信息
- **方法：** GET
- **路径：** `/api/health`
- **认证：** 无需认证
- **示例链接：** [http://localhost:19198/api/health](http://localhost:19198/api/health)

### 响应示例

```json
{
  "status": "ok",
  "message": "Server is running",
  "timestamp": "2025-10-19T13:31:20.248Z",
  "timezone": "Asia/Shanghai (UTC+8)",
  "uptime": 438.118606129,
  "totalRequests": 1500,
  "errorRate": 0.5
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `status` | string | 服务器状态，固定为 "ok" |
| `message` | string | 状态描述信息 |
| `timestamp` | string | 当前时间戳 (ISO 8601格式) |
| `timezone` | string | 服务器时区信息 |
| `uptime` | number | 服务器运行时间（秒） |
| `totalRequests` | number | 总请求数（自服务器启动以来） |
| `errorRate` | number | 错误率（百分比，保留一位小数） |

### 使用场景

- **服务监控：** 检查后端服务是否正常运行
- **负载均衡：** 健康检查端点，用于负载均衡器判断服务可用性
- **运维监控：** 监控系统运行状态和运行时间
- **性能监控：** 通过请求数和错误率监控API性能
- **实时统计：** 获取服务器启动以来的请求统计信息
- **错误率监控：** 实时监控系统错误率，及时发现异常

### 错误处理

此接口通常不会返回错误，如果无法访问说明服务器未启动或网络问题。

---

## 相关文档

- [API文档首页](../README.md)
- [通用信息](../common.md)
- [错误处理](../common.md#错误处理)
