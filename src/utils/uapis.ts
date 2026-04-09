import { UapiClient } from 'uapi-sdk-typescript';

type WeatherAirPollutants = {
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
};

type WeatherForecastItem = {
  date: string;
  week: string;
  temp_max: number;
  temp_min: number;
  weather_day: string;
  weather_night: string;
  wind_dir_day?: string;
  wind_dir_night?: string;
  wind_scale_day?: string;
  wind_scale_night?: string;
  wind_speed_day?: number;
  humidity?: number;
  precip?: number;
  visibility?: number;
  uv_index?: number;
  sunrise?: string;
  sunset?: string;
};

type WeatherHourlyForecastItem = {
  time: string;
  temperature: number;
  weather: string;
  wind_direction?: string;
  wind_speed?: number;
  wind_scale?: string;
  humidity?: number;
  precip?: number;
  pressure?: number;
  cloud?: number;
  feels_like?: number;
  dew_point?: number;
  visibility?: number;
  pop?: number;
  uv_index?: number;
};

type WeatherMinutelyPrecipItem = {
  time: string;
  precip: number;
  type: 'rain' | 'snow';
};

type WeatherMinutelyPrecip = {
  summary: string;
  update_time: string;
  data: WeatherMinutelyPrecipItem[];
};

type WeatherLifeIndexItem = {
  level: string;
  brief: string;
  advice: string;
};

type WeatherLifeIndices = {
  clothing?: WeatherLifeIndexItem;
  uv?: WeatherLifeIndexItem;
  car_wash?: WeatherLifeIndexItem;
  drying?: WeatherLifeIndexItem;
  air_conditioner?: WeatherLifeIndexItem;
  cold_risk?: WeatherLifeIndexItem;
  exercise?: WeatherLifeIndexItem;
  comfort?: WeatherLifeIndexItem;
  travel?: WeatherLifeIndexItem;
  fishing?: WeatherLifeIndexItem;
  allergy?: WeatherLifeIndexItem;
  sunscreen?: WeatherLifeIndexItem;
  mood?: WeatherLifeIndexItem;
  beer?: WeatherLifeIndexItem;
  umbrella?: WeatherLifeIndexItem;
  traffic?: WeatherLifeIndexItem;
  air_purifier?: WeatherLifeIndexItem;
  pollen?: WeatherLifeIndexItem;
};

type GetMiscWeatherSuccessResponse = {
  province: string;
  city: string;
  district: string;
  adcode: string;
  weather: string;
  weather_icon: string;
  temperature: number;
  wind_direction: string;
  wind_power: string;
  humidity: number;
  report_time: string;
  feels_like?: number;
  visibility?: number;
  pressure?: number;
  uv?: number;
  precipitation?: number;
  cloud?: number;
  aqi?: number;
  aqi_level?: number;
  aqi_category?: string;
  aqi_primary?: string;
  air_pollutants?: WeatherAirPollutants;
  temp_max?: number;
  temp_min?: number;
  forecast?: WeatherForecastItem[];
  hourly_forecast?: WeatherHourlyForecastItem[];
  minutely_precip?: WeatherMinutelyPrecip;
  life_indices?: WeatherLifeIndices;
};

type GetMiscWeatherErrorResponse = {
  code: 'INVALID_PARAMETER' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR' | 'SERVICE_UNAVAILABLE';
  message: string;
};

type GetMiscWeatherResponse = GetMiscWeatherSuccessResponse | GetMiscWeatherErrorResponse;

type GetMiscWeatherPayload = {
  /** 城市名，例如北京、上海。与 adcode 二选一或同时传入。 */
  city: string;
  /** 行政区划代码，可用于更精确定位区域。 */
  adcode: string;
  /** 是否返回扩展天气信息，如体感温度、能见度、气压、AQI 等。 */
  extended: boolean;
  /** 是否返回未来多天预报数据。 */
  forecast: boolean;
  /** 是否返回逐小时预报数据。 */
  hourly: boolean;
  /** 是否返回分钟级降水预报。 */
  minutely: boolean;
  /** 是否返回生活指数数据。 */
  indices: boolean;
  /** 返回语言，当前仅支持中文。 */
  lang: 'zh';
};

type GetNetworkIpinfoErrorResponse = {
  code: 'INVALID_ARGUMENT' | 'NOT_FOUND' | 'INTERNAL_SERVER_ERROR';
  details: object;
  message: string;
};

type GetNetworkIpinfoSuccessResponse<T = 'commercial' | undefined> = T extends 'commercial'
  ? {
      /** ip */
      ip: string;
      /** IP段起始地址（标准查询） */
      beginip: string;
      /** IP段结束地址（标准查询） */
      endip: string;
      /** 地理位置，格式：国家 省份 城市 */
      region: string;
      /** 运营商名称 */
      isp: string;
      /** 自治系统编号 */
      asn: string;
      /** 归属机构 */
      llc: string;
      /** 纬度 */
      latitude: number;
      /** 经度 */
      longitude: number;
    }
  : {
      /** ip */
      ip: string;
      /** 地理位置，格式：国家 省份 城市 */
      region: string;
      /** 运营商名称 */
      isp: string;
      /** 自治系统编号 */
      asn: string;
      /** 归属机构 */
      llc: string;
      /** 纬度 */
      latitude: number;
      /** 经度 */
      longitude: number;
      /** 地区代码 */
      area_code: string;
      /** 邮政编码 */
      zip_code: string;
      /** 时区 */
      time_zone: string;
    };

type GetNetworkIpinfoResponse<T extends 'commercial' | undefined = undefined> =
  | GetNetworkIpinfoSuccessResponse<T>
  | GetNetworkIpinfoErrorResponse;

type GetNetworkIpinfoPayload = {
  /** id地址 */
  ip: string;
  /** 查询结果类型 */
  source?: 'commercial';
};

interface uapi {
  misc: {
    /**
     * 查询天气信息。
     *
     * 可按需返回实时天气、扩展天气、未来预报、逐小时预报、分钟级降水和生活指数等信息。
     *
     * @param payload 查询参数
     * @param payload.city 城市名，例如北京、上海
     * @param payload.adcode 行政区划代码，可用于更精确定位区域
     * @param payload.extended 是否返回扩展天气信息，如 AQI、体感温度、气压等
     * @param payload.forecast 是否返回未来多天预报
     * @param payload.hourly 是否返回逐小时预报
     * @param payload.minutely 是否返回分钟级降水预报
     * @param payload.indices 是否返回生活指数
     * @param payload.lang 返回语言，当前仅支持 `zh`
     * @returns 天气查询结果，成功时返回天气数据，失败时返回错误码和错误信息
     */
    getMiscWeather: (payload: GetMiscWeatherPayload) => Promise<GetMiscWeatherResponse>;
  };
  network: {
    getNetworkIpinfo: <T extends 'commercial' | undefined = undefined>(
      payload: GetNetworkIpinfoPayload
    ) => Promise<GetNetworkIpinfoResponse<T>>;
  };
}

if (!process.env.UAPIS_API_KEY) {
  throw new Error('UAPIS_API_KEY 为设置');
}
// 创建UapiClient实例
export const uapiClient = new UapiClient(
  process.env.UAPIS_BASE_URL!,
  process.env.UAPIS_API_KEY
) as unknown as uapi;

export const getMiscWeather = async (
  payload: GetMiscWeatherPayload
): Promise<GetMiscWeatherResponse> => {
  return uapiClient.misc.getMiscWeather(payload);
};
