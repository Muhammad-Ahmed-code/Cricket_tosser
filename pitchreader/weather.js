const lat = 51.5074;
const lng = -0.1278;

const url = new URL('https://api.open-meteo.com/v1/forecast');
url.search = new URLSearchParams({
  latitude: lat,
  longitude: lng,
  hourly: 'temperature_2m,precipitation,relativehumidity_2m,windspeed_10m',
  past_days: 2,
  forecast_days: 1,
}).toString();

const response = await fetch(url);
if (!response.ok) {
  console.error(`Open-Meteo API error ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const data = await response.json();
const { time, temperature_2m, precipitation, relativehumidity_2m, windspeed_10m } = data.hourly;

// Find the index of the current hour
const now = new Date();
const currentHourISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:00`;
let currentIndex = time.indexOf(currentHourISO);
if (currentIndex === -1) currentIndex = time.length - 1; // fallback to latest

// Sum precipitation over the past 48 hours (48 hourly slots ending at current hour)
const startIndex = Math.max(0, currentIndex - 47);
const rain_last_48h_mm = precipitation
  .slice(startIndex, currentIndex + 1)
  .reduce((sum, val) => sum + (val ?? 0), 0);

const temp_celsius = temperature_2m[currentIndex];
const humidity_percent = relativehumidity_2m[currentIndex];
const wind_kph = windspeed_10m[currentIndex];

const conditions =
  rain_last_48h_mm < 2 ? 'dry' : rain_last_48h_mm <= 10 ? 'damp' : 'wet';

const summary = {
  temp_celsius,
  humidity_percent,
  wind_kph,
  rain_last_48h_mm: Math.round(rain_last_48h_mm * 10) / 10,
  conditions,
};

console.log(JSON.stringify(summary, null, 2));
