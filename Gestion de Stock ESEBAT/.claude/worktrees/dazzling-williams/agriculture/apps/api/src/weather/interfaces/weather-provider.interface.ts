export interface WeatherDailyItem {
  date: string;
  tMin?: number;
  tMax?: number;
  tAvg?: number;
  humidityAvg?: number;
  rainfallMm?: number;
  windSpeedAvg?: number;
}

export interface IWeatherProvider {
  fetchDailyForecast(lat: number, lng: number, days: number): Promise<WeatherDailyItem[]>;
  fetchHistoricalDaily?(
    lat: number,
    lng: number,
    from: string,
    to: string
  ): Promise<WeatherDailyItem[]>;
}
