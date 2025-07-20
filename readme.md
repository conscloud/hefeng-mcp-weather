# HeFeng Weather MCP Server

A Model Context Protocol server that provides weather forecast data for locations in China through HeFeng Weather API.

## Features

- 获取实时天气、逐小时和多天预报
- 城市名称模糊搜索及经纬度查询
- 获取天气灾害预警信息
- 获取天气生活指数（如穿衣、洗车、运动等）
- 支持JWT认证，API主机可配置

## 配置参数

- `apiHost`：API主机地址（如 https://devapi.qweather.com）
- `privateKey`：EdDSA私钥
- `keyId`：密钥ID
- `projectId`：项目ID

## 可用工具及参数

### 1. get-weather
获取实时天气、逐小时或多天预报。
- `location` (string, 必填)：经纬度或LocationID（如 101010100 或 116.41,39.92）
- `days` (string, 可选)：now（实时）、24h、72h、168h、3d、7d、10d、15d、30d，默认now

### 2. city-lookup
根据城市名称模糊搜索，返回经纬度、城市ID等信息。
- `location` (string, 必填)：城市名称，支持模糊搜索
- `adm` (string, 可选)：上级行政区划
- `range` (string, 可选)：搜索范围（如cn）
- `number` (number, 可选)：返回结果数量，1-20，默认10

### 3. weather-warning
获取指定地区的天气灾害预警信息。
- `location` (string, 必填)：LocationID或经纬度
- `lang` (string, 可选)：多语言，默认zh

### 4. indices-forecast
获取天气生活指数预报（如穿衣、洗车、运动等）。
- `location` (string, 必填)：LocationID或经纬度
- `type` (string, 必填)：指数类型ID，多个用英文逗号分隔（如1,2,3）
- `days` (string, 可选)：1d或3d，默认1d
- `lang` (string, 可选)：多语言，默认zh

## 使用示例

```json
{
  "mcpServers": {
    "hefeng-weather": {
      "command": "npx",
      "args": [
        "hefeng-weather-mcp@latest",
        "--apiHost=https://devapi.qweather.com",
        "--privateKey=${YOUR_PRIVATE_KEY}",
        "--keyId=${YOUR_KEY_ID}",
        "--projectId=${YOUR_PROJECT_ID}"
      ]
    }
  }
}
```

## 工具调用示例

### get-weather
```json
{
  "name": "get-weather",
  "arguments": { "location": "101010100", "days": "3d" }
}
```

### city-lookup
```json
{
  "name": "city-lookup",
  "arguments": { "location": "北京" }
}
```

### weather-warning
```json
{
  "name": "weather-warning",
  "arguments": { "location": "101010100" }
}
```

### indices-forecast
```json
{
  "name": "indices-forecast",
  "arguments": { "location": "101010100", "type": "1,2", "days": "1d" }
}
```

# License

This MCP server is licensed under the MIT License. For more details, please see the LICENSE file in the project repository.

# 致谢

本项目基于 [https://github.com/shanggqm/hefeng-mcp-weather](https://github.com/shanggqm/hefeng-mcp-weather) 开发，感谢原作者开源贡献。
