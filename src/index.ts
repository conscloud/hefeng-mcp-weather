import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { SignJWT, importPKCS8 } from "jose";

// API配置
let API_HOST = "https://devapi.qweather.com"; // 默认API主机
let PRIVATE_KEY = "";
let KEY_ID = "";
let PROJECT_ID = "";

// 从命令行参数获取配置
const apiHostArg = process.argv.find(arg => arg.startsWith('--apiHost='));
const privateKeyArg = process.argv.find(arg => arg.startsWith('--privateKey='));
const keyIdArg = process.argv.find(arg => arg.startsWith('--keyId='));
const projectIdArg = process.argv.find(arg => arg.startsWith('--projectId='));

if (apiHostArg) {
    API_HOST = apiHostArg.split('=')[1];
}
if (privateKeyArg) {
    PRIVATE_KEY = privateKeyArg.split('=')[1];
}
if (keyIdArg) {
    KEY_ID = keyIdArg.split('=')[1];
}
if (projectIdArg) {
    PROJECT_ID = projectIdArg.split('=')[1];
}

// 生成JWT Token
async function generateJWT(): Promise<string> {
    try {
        const privateKey = await importPKCS8(PRIVATE_KEY, 'EdDSA');
        const iat = Math.floor(Date.now() / 1000) - 30;
        const exp = iat + 900;
        
        const jwt = await new SignJWT({
            sub: PROJECT_ID,
            iat: iat,
            exp: exp
        })
        .setProtectedHeader({
            alg: 'EdDSA',
            kid: KEY_ID
        })
        .sign(privateKey);
        
        return jwt;
    } catch (error) {
        console.error("Error generating JWT:", error);
        throw error;
    }
}

// 移除旧的API KEY相关代码，现在使用JWT认证

// Define Zod schemas for validation
const WeatherArgumentsSchema = z.object({
    location: z.string(), // Location name or coordinates
    days: z.enum(['now', '24h', '72h', '168h', '3d', '7d', '10d', '15d', '30d']).default('now'), // 预报天数
});

const CityLookupArgumentsSchema = z.object({
    location: z.string(), // 城市名称
    adm: z.string().optional(), // 上级行政区划
    range: z.string().optional(), // 搜索范围
    number: z.number().min(1).max(20).optional().default(10), // 返回结果数量
});

const WeatherWarningArgumentsSchema = z.object({
    location: z.string(), // LocationID或经纬度坐标
    lang: z.string().optional().default('zh'), // 多语言设置
});

const IndicesForecastArgumentsSchema = z.object({
    location: z.string(), // LocationID或经纬度
    type: z.string(),     // 指数类型ID，多个用英文逗号分隔
    days: z.enum(['1d', '3d']).default('1d'), // 预报天数
    lang: z.string().optional().default('zh'), // 多语言
});

// Create server instance
const server = new Server(
    {
        name: "weather-zhcn",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get-weather",
                description: "获取中国国内的天气预报",
                inputSchema: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "逗号分隔的经纬度信息 (e.g., 116.40,39.90)",
                        },
                        days: {
                            type: "string",
                            enum: ["now", "24h", "72h", "168h", "3d", "7d", "10d", "15d", "30d"],
                            description: "预报天数，now为实时天气，24h为24小时预报，72h为72小时预报，168h为168小时预报，3d为3天预报，以此类推",
                            default: "now"
                        }
                    },
                    required: ["location"],
                },
            },
            {
                name: "city-lookup",
                description: "根据城市名称搜索城市信息，返回经纬度坐标",
                inputSchema: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "城市名称，支持模糊搜索",
                        },
                        adm: {
                            type: "string",
                            description: "上级行政区划，可选参数",
                        },
                        range: {
                            type: "string",
                            description: "搜索范围，可选参数",
                        },
                        number: {
                            type: "number",
                            description: "返回结果数量，1-20，默认10",
                            default: 10
                        }
                    },
                    required: ["location"],
                },
            },
            {
                name: "weather-warning",
                description: "获取天气灾害预警信息",
                inputSchema: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "LocationID或经纬度坐标 (e.g., 101010100 或 116.41,39.92)",
                        },
                        lang: {
                            type: "string",
                            description: "多语言设置，默认zh",
                            default: "zh"
                        }
                    },
                    required: ["location"],
                },
            },
            {
                name: "indices-forecast",
                description: "获取天气生活指数预报（如穿衣、洗车、运动等）",
                inputSchema: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "LocationID或经纬度坐标 (e.g., 101010100 或 116.41,39.92)",
                        },
                        type: {
                            type: "string",
                            description: "指数类型ID，多个用英文逗号分隔（如1,2,3）",
                        },
                        days: {
                            type: "string",
                            enum: ["1d", "3d"],
                            description: "预报天数，1d或3d",
                            default: "1d"
                        },
                        lang: {
                            type: "string",
                            description: "多语言设置，默认zh",
                            default: "zh"
                        }
                    },
                    required: ["location", "type"],
                },
            },
        ],
    };
});

// Helper function for making HeFeng API requests with JWT authentication
async function makeHeFengRequest<T>(url: string): Promise<T | null> {
    try {
        const jwt = await generateJWT();
        const headers = {
            Accept: "application/json",
            Authorization: `Bearer ${jwt}`
        };

        const response = await fetch(url, { headers });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return (await response.json()) as T;
    } catch (error) {
        console.error("Error making HeFeng request:", error);
        return null;
    }
}

interface HeFengWeatherNowResponse {
    now: {
        obsTime: string;
        temp: string;
        feelsLike: string;
        text: string;
        windDir: string;
        windScale: string;
    };
}

interface HeFengWeatherDailyResponse {
    daily: Array<{
        fxDate: string;
        tempMax: string;
        tempMin: string;
        textDay: string;
        textNight: string;
        windDirDay: string;
        windScaleDay: string;
        windDirNight: string;
        windScaleNight: string;
    }>;
}

interface HeFengWeatherHourlyResponse {
    hourly: Array<{
        fxTime: string;
        temp: string;
        text: string;
        windDir: string;
        windScale: string;
        humidity: string;
    }>;
}

interface HeFengCityLookupResponse {
    location: Array<{
        name: string;
        id: string;
        lat: string;
        lon: string;
        adm2: string;
        adm1: string;
        country: string;
        tz: string;
        utcOffset: string;
        isDst: string;
        type: string;
        rank: string;
        fxLink: string;
    }>;
}

interface HeFengWeatherWarningResponse {
    warning: Array<{
        id: string;
        sender: string;
        pubTime: string;
        title: string;
        startTime: string;
        endTime: string;
        status: string;
        level: string;
        type: string;
        typeName: string;
        urgency: string;
        certainty: string;
        text: string;
        related: string;
    }>;
}

interface HeFengIndicesForecastResponse {
    daily: Array<{
        date: string;
        type: string;
        name: string;
        level: string;
        category: string;
        text: string;
    }>;
}

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === "city-lookup") {
            const { location, adm, range, number } = CityLookupArgumentsSchema.parse(args);
            
            // 构建查询参数
            const params = new URLSearchParams();
            params.append('location', location);
            if (adm) params.append('adm', adm);
            if (range) params.append('range', range);
            params.append('number', number.toString());
            
            const lookupUrl = `${API_HOST}/geo/v2/city/lookup?${params.toString()}`;
            const cityData = await makeHeFengRequest<HeFengCityLookupResponse>(lookupUrl);

            if (!cityData || !cityData.location || cityData.location.length === 0) {
                return {
                    content: [{ type: "text", text: `未找到城市 "${location}" 的相关信息` }],
                };
            }

            const cityList = cityData.location.map(city => {
                return `城市: ${city.name}\n` +
                    `ID: ${city.id}\n` +
                    `经纬度: ${city.lat}, ${city.lon}\n` +
                    `省份: ${city.adm1}\n` +
                    `城市: ${city.adm2}\n` +
                    `国家: ${city.country}\n` +
                    `时区: ${city.tz}\n` +
                    `类型: ${city.type}\n` +
                    `------------------------`;
            }).join('\n');

            return {
                content: [{
                    type: "text",
                    text: `搜索 "${location}" 的结果:\n${cityList}`
                }],
            };
        } else if (name === "weather-warning") {
            const { location, lang } = WeatherWarningArgumentsSchema.parse(args);
            
            const warningUrl = `${API_HOST}/v7/warning/now?location=${location}&lang=${lang}`;
            const warningData = await makeHeFengRequest<HeFengWeatherWarningResponse>(warningUrl);

            if (!warningData || !warningData.warning || warningData.warning.length === 0) {
                return {
                    content: [{ type: "text", text: `当前 ${location} 地区暂无天气预警信息` }],
                };
            }

            const warningList = warningData.warning.map(warning => {
                return `预警标题: ${warning.title}\n` +
                    `预警类型: ${warning.typeName} (${warning.type})\n` +
                    `预警等级: ${warning.level}\n` +
                    `预警状态: ${warning.status}\n` +
                    `发布时间: ${warning.pubTime}\n` +
                    `生效时间: ${warning.startTime} 至 ${warning.endTime}\n` +
                    `紧急程度: ${warning.urgency}\n` +
                    `确定性: ${warning.certainty}\n` +
                    `发布单位: ${warning.sender}\n` +
                    `预警内容: ${warning.text}\n` +
                    `------------------------`;
            }).join('\n');

            return {
                content: [{
                    type: "text",
                    text: `${location} 地区天气预警信息:\n${warningList}`
                }],
            };
        } else if (name === "get-weather") {
            const { location, days } = WeatherArgumentsSchema.parse(args);

            if (days === 'now') {
                // Get current weather data
                const weatherUrl = `${API_HOST}/v7/weather/now?location=${location}`;
                const weatherData = await makeHeFengRequest<HeFengWeatherNowResponse>(weatherUrl);

                if (!weatherData || !weatherData.now) {
                    return {
                        content: [{ type: "text", text: `无法获取 ${location} 的天气数据` }],
                    };
                }

                const { now } = weatherData;
                const weatherText = `地点: ${location}\n` +
                    `观测时间: ${now.obsTime}\n` +
                    `天气: ${now.text}\n` +
                    `温度: ${now.temp}°C\n` +
                    `体感温度: ${now.feelsLike}°C\n` +
                    `风向: ${now.windDir}\n` +
                    `风力: ${now.windScale}级`;

                return { content: [{ type: "text", text: weatherText }] };
            } else if (['24h', '72h', '168h'].includes(days)) {
                // Get hourly forecast data
                const weatherUrl = `${API_HOST}/v7/weather/${days}?location=${location}`;
                const weatherData = await makeHeFengRequest<HeFengWeatherHourlyResponse>(weatherUrl);

                if (!weatherData || !weatherData.hourly) {
                    return {
                        content: [{ type: "text", text: `无法获取 ${location} 的逐小时天气预报数据` }],
                    };
                }

                const hoursText = weatherData.hourly.map(hour => {
                    return `时间: ${hour.fxTime}\n` +
                        `天气: ${hour.text}\n` +
                        `温度: ${hour.temp}°C\n` +
                        `湿度: ${hour.humidity}%\n` +
                        `风向: ${hour.windDir} ${hour.windScale}级\n` +
                        `------------------------`;
                }).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `地点: ${location}\n${days}小时预报:\n${hoursText}`
                    }],
                };
            } else {
                // Get daily forecast weather data
                const daysNum = parseInt(days);
                const weatherUrl = `${API_HOST}/v7/weather/${days}?location=${location}`;
                const weatherData = await makeHeFengRequest<HeFengWeatherDailyResponse>(weatherUrl);

                if (!weatherData || !weatherData.daily) {
                    return {
                        content: [{ type: "text", text: `无法获取 ${location} 的天气预报数据` }],
                    };
                }

                const forecastText = weatherData.daily.map(day => {
                    return `日期: ${day.fxDate}\n` +
                        `白天天气: ${day.textDay}\n` +
                        `夜间天气: ${day.textNight}\n` +
                        `最高温度: ${day.tempMax}°C\n` +
                        `最低温度: ${day.tempMin}°C\n` +
                        `白天风向: ${day.windDirDay} ${day.windScaleDay}级\n` +
                        `夜间风向: ${day.windDirNight} ${day.windScaleNight}级\n` +
                        `------------------------`;
                }).join('\n');

                return {
                    content: [{
                        type: "text",
                        text: `地点: ${location}\n${daysNum}天预报:\n${forecastText}`
                    }],
                };
            }
        } else if (name === "indices-forecast") {
            const { location, type, days, lang } = IndicesForecastArgumentsSchema.parse(args);

            const indicesUrl = `${API_HOST}/v7/indices/${days}?location=${location}&type=${type}&lang=${lang}`;
            const indicesData = await makeHeFengRequest<HeFengIndicesForecastResponse>(indicesUrl);

            if (!indicesData || !indicesData.daily || indicesData.daily.length === 0) {
                return {
                    content: [{ type: "text", text: `未查询到 ${location} 的天气指数信息` }],
                };
            }

            const indicesList = indicesData.daily.map(idx => {
                return `日期: ${idx.date}\n` +
                    `类型: ${idx.name}（ID: ${idx.type}）\n` +
                    `等级: ${idx.level}（${idx.category}）\n` +
                    `建议: ${idx.text}\n` +
                    `------------------------`;
            }).join('\n');

            return {
                content: [{
                    type: "text",
                    text: `${location} 的天气生活指数:\n${indicesList}`
                }],
            };
        } else {
            throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new Error(
                `Invalid arguments: ${error.errors
                    .map((e) => `${e.path.join(".")}: ${e.message}`)
                    .join(", ")}`
            );
        }
        throw error;
    }
});

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Weather-zhcn MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});

