# Weather API Demo

A simple Node.js Express server that provides mock weather data for testing the AI Data Visualization package.

## Quick Start

```bash
cd api-server
npm install
npm start
```

Server runs on: `http://localhost:3001`

## API Endpoints

### Cities
- `GET /api/cities` - Get all available cities

### Weather Data  
- `GET /api/weather/current` - Current weather for all cities
- `GET /api/weather/current/:cityId` - Current weather for specific city
- `GET /api/weather/forecast/:cityId` - 7-day forecast for specific city
- `GET /api/weather/stats` - Weather statistics for charts

### Documentation
- `GET /api/docs` - API documentation
- `GET /` - Server info

## Example Requests

```bash
# Get all cities
curl http://localhost:3001/api/cities

# Get current weather for all cities  
curl http://localhost:3001/api/weather/current

# Get forecast for New York (cityId: 1)
curl http://localhost:3001/api/weather/forecast/1

# Get weather statistics
curl http://localhost:3001/api/weather/stats
```

## Response Format

All responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "count": 8
}
```

## Sample Data

The API includes weather data for 8 major cities:
- New York, USA
- London, UK  
- Tokyo, Japan
- Sydney, Australia
- Paris, France
- Berlin, Germany
- Toronto, Canada
- Mumbai, India

Data includes: temperature, weather conditions, humidity, wind speed, pressure, and forecasts. 