const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Mock weather data
const cities = [
  { id: 1, name: 'New York', country: 'USA', lat: 40.7128, lon: -74.0060 },
  { id: 2, name: 'London', country: 'UK', lat: 51.5074, lon: -0.1278 },
  { id: 3, name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
  { id: 4, name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093 },
  { id: 5, name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
  { id: 6, name: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050 },
  { id: 7, name: 'Toronto', country: 'Canada', lat: 43.6532, lon: -79.3832 },
  { id: 8, name: 'Mumbai', country: 'India', lat: 19.0760, lon: 72.8777 }
];

const weatherConditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'foggy', 'windy'];

// Generate random weather data
function generateWeatherData(cityId) {
  const city = cities.find(c => c.id === cityId);
  if (!city) return null;

  const temp = Math.round(Math.random() * 40 - 10); // -10 to 30°C
  const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  const humidity = Math.round(Math.random() * 100);
  const windSpeed = Math.round(Math.random() * 50);
  const pressure = Math.round(980 + Math.random() * 60); // 980-1040 hPa

  return {
    id: city.id,
    city: city.name,
    country: city.country,
    coordinates: { lat: city.lat, lon: city.lon },
    temperature: temp,
    condition: condition,
    humidity: humidity,
    windSpeed: windSpeed,
    pressure: pressure,
    timestamp: new Date().toISOString()
  };
}

// Generate weekly forecast
function generateWeeklyForecast(cityId) {
  const city = cities.find(c => c.id === cityId);
  if (!city) return null;

  const forecast = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const temp = Math.round(Math.random() * 40 - 10);
    const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    forecast.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
      temperature: temp,
      condition: condition,
      rainChance: Math.round(Math.random() * 100)
    });
  }

  return {
    city: city.name,
    country: city.country,
    forecast: forecast
  };
}

// API Routes

// Get all cities
app.get('/api/cities', (req, res) => {
  res.json({
    success: true,
    data: cities,
    count: cities.length
  });
});

// Get current weather for all cities
app.get('/api/weather/current', (req, res) => {
  const allWeather = cities.map(city => generateWeatherData(city.id));
  res.json({
    success: true,
    data: allWeather,
    count: allWeather.length
  });
});

// Get current weather for specific city
app.get('/api/weather/current/:cityId', (req, res) => {
  const cityId = parseInt(req.params.cityId);
  const weather = generateWeatherData(cityId);
  
  if (!weather) {
    return res.status(404).json({
      success: false,
      error: 'City not found'
    });
  }
  
  res.json({
    success: true,
    data: weather
  });
});

// Get weekly forecast for specific city
app.get('/api/weather/forecast/:cityId', (req, res) => {
  const cityId = parseInt(req.params.cityId);
  const forecast = generateWeeklyForecast(cityId);
  
  if (!forecast) {
    return res.status(404).json({
      success: false,
      error: 'City not found'
    });
  }
  
  res.json({
    success: true,
    data: forecast
  });
});

// Get weather statistics (for charts)
app.get('/api/weather/stats', (req, res) => {
  const stats = {
    temperatureByCity: cities.map(city => ({
      city: city.name,
      temperature: Math.round(Math.random() * 40 - 10)
    })),
    conditionDistribution: weatherConditions.map(condition => ({
      condition: condition,
      count: Math.round(Math.random() * 20 + 5)
    })),
    weeklyTemperatures: Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 6 + i);
      return {
        date: date.toISOString().split('T')[0],
        avgTemp: Math.round(Math.random() * 30 + 10)
      };
    })
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'Weather API Documentation',
    version: '1.0.0',
    endpoints: [
      { method: 'GET', path: '/api/cities', description: 'Get all available cities' },
      { method: 'GET', path: '/api/weather/current', description: 'Get current weather for all cities' },
      { method: 'GET', path: '/api/weather/current/:cityId', description: 'Get current weather for specific city' },
      { method: 'GET', path: '/api/weather/forecast/:cityId', description: 'Get 7-day forecast for specific city' },
      { method: 'GET', path: '/api/weather/stats', description: 'Get weather statistics for visualizations' }
    ]
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Weather API Demo Server',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: ['/api/cities', '/api/weather/current', '/api/weather/stats']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🌤️  Weather API Server running on http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🌍 Cities: http://localhost:${PORT}/api/cities`);
  console.log(`🌡️  Current Weather: http://localhost:${PORT}/api/weather/current`);
  console.log(`📊 Weather Stats: http://localhost:${PORT}/api/weather/stats`);
});

module.exports = app; 