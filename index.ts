import {
  InfluxDB,
  Point,
  HttpError,
  WriteApi,
} from "@influxdata/influxdb-client";
import { hostname } from "node:os";
import "dotenv/config";
import express from "express";
import axios, { AxiosRequestConfig } from "axios";

const app = express();
const port = 3006;

// env variables
const foreCastUrl = process.env.SOLAR_FORECAST_URL || "";
const influxUrl = process.env.INFLUX_URL || "";
const token = process.env.INFLUX_TOKEN || "";
const org = process.env.INFLUX_ORG || "";
const bucket = process.env.BUCKET || "";
const lat: number = parseFloat(process.env.LAT || "");
const long: number = parseFloat(process.env.LONG || "");
const declination: string = process.env.SOLAR_FORECAST_DECLINATION || "";
const azimuth: string = process.env.SOLAR_FORECAST_AZIMUTH || "";
const kwp: string = process.env.SOLAR_FORECAST_KWP || "";

function writePoint(
  writeApi: WriteApi,
  forecast: Forecast,
  segmentKey: "watts" | "watt_hours" | "watt_hours_period" | "watt_hours_day"
) {
  if (forecast.result[segmentKey]) {
    for (let [key, value] of Object.entries(forecast.result[segmentKey])) {
      console.log(key, value);
      const point = new Point(`solarforecast_${segmentKey}`)
        .floatField("value", parseFloat(value.toString()))
        .timestamp(new Date(1000 * parseFloat(key)));
      writeApi.writePoint(point);
      console.log(` ${point.toLineProtocol(writeApi)}`);
    }
  }
}

async function writePoints(forecast: Forecast) {
  console.log("*** WRITE POINTS ***");
  const writeApi = new InfluxDB({ url: influxUrl, token }).getWriteApi(
    org,
    bucket,
    "ns"
  );
  writeApi.useDefaultTags({ location: hostname() });

  if (forecast.result) {
    writeApi.useDefaultTags({ location: hostname() });

    writePoint(writeApi, forecast, "watts");
    writePoint(writeApi, forecast, "watt_hours");
    writePoint(writeApi, forecast, "watt_hours_period");
    writePoint(writeApi, forecast, "watt_hours_day");

    if (forecast.message && forecast.message.ratelimit) {
      const requestsRemaining = forecast.message.ratelimit.remaining;
      const requestRemainingPoint = new Point(
        "solarforecast_request_remaining"
      ).floatField("value", requestsRemaining);
      writeApi.writePoint(requestRemainingPoint);
    }

    const lastUpdated = new Point("solarforecast_lastUpdated").floatField(
      "value",
      new Date().getTime() / 1000
    );
    writeApi.writePoint(lastUpdated);
    console.log(` ${lastUpdated.toLineProtocol(writeApi)}`);
  }

  try {
    await writeApi.close();
    console.log("FINISHED ...");
  } catch (e) {
    console.error(e);
    if (e instanceof HttpError && e.statusCode === 401) {
      console.log("error: influx db not found");
    }
    console.log("\nFinished ERROR");
  }
}

type ForecastSegment = {
  [key: string]: number;
};

interface Forecast {
  result: {
    watts: ForecastSegment;
    watt_hours_period: ForecastSegment;
    watt_hours: ForecastSegment;
    watt_hours_day: ForecastSegment;
  };
  message: {
    code: number;
    type: string;
    text: string;
    info: {
      latitude: number;
      longitude: number;
      distance: number;
      place: string;
      timezone: string;
      time: string;
      time_utc: string;
    };
    ratelimit: {
      period: number;
      limit: number;
      remaining: number;
    };
  };
}

const api = axios.create({
  baseURL: foreCastUrl,
  timeout: 28000,
});

export const apiRequest = async <T>(config: AxiosRequestConfig): Promise<T> => {
  try {
    const response = await api(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getForecast = async (): Promise<Forecast> => {
  const url = `${lat}/${long}/${declination}/${azimuth}/${kwp}?time=seconds`;
  const config: AxiosRequestConfig = {
    method: "GET",
    url,
  };
  return await apiRequest<Forecast>(config);
};

app.get("/", async (req, res) => {
  const response = getForecast();
  const forecast = await response;
  await writePoints(forecast);

  return res.json({ forecast });
});

const server = app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});

server.setTimeout(500000);
