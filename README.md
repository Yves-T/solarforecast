# solar forecast

Receives data from [forecast.solar](https://forecast.solar/)

## Setup

You need to create a `.env` file in the project root

#### env file

Provide this parameters

- LAT=your latitude
- LONG=your longitude
- INFLUX_URL="http://url_to_influxDB"
- INFLUX_TOKEN="your_influx_token"
- INFLUX_ORG="your_influx_org"
- BUCKET="your_bucket"
- SOLAR_FORECAST_URL="https://api.forecast.solar/estimate/"
- SOLAR_FORECAST_DECLINATION=your_declination ( see api docs )
- SOLAR_FORECAST_AZIMUTH=your_azimuth ( see api docs )
- SOLAR_FORECAST_KWP=your_panel_kwp ( see api docs )

For a detailed explanation of the estimate endpoint please consult the official [solar forecast documentation](https://doc.forecast.solar/api:estimate)

Here is a short summary:

- lat : latitude of location, -90 (south) … 90 (north); handeled with a precission of 0.0001 or abt. 10 m
- lon : longitude of location, -180 (west) … 180 (east); handeled with a precission of 0.0001 or abt. 10 m
- dec : plane declination, 0 (horizontal) … 90 (vertical); integer
 -az : plane azimuth, -180 … 180 (-180 = north, -90 = east, 0 = south, 90 = west, 180 = north); integer
- kwp : installed modules power in kilo watt; float

## Development