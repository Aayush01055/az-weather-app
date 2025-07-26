import OPEN_WEATHER_API_KEY from "./apiKey.js";

// DOM Elements
const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const cityName = document.getElementById("city-name");
const currentDate = document.getElementById("current-date");
const weatherIconMain = document.getElementById("weather-icon-main");
const temperature = document.getElementById("temperature");
const weatherDescription = document.getElementById("weather-description");
const feelsLike = document.getElementById("feels-like");
const wind = document.getElementById("wind");
const humidity = document.getElementById("humidity");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");
const forecastItems = document.getElementById("forecast-items");
const loading = document.getElementById("loading");
const errorContainer = document.getElementById("error-container");
const errorMessage = document.getElementById("error-message");
const weatherData = document.getElementById("weather-data");
const weatherApp = document.getElementById("weather-app");
const themeToggle = document.getElementById("theme-toggle");
const historyItems = document.getElementById("history-items");

// App State
let state = {
  weatherHistory: JSON.parse(localStorage.getItem("weatherHistory")) || [],
  isDarkMode: localStorage.getItem("weatherDarkMode") === "true",
};

// Initialize theme
if (state.isDarkMode) {
  document.body.classList.add("dark-theme");
  themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

themeToggle.addEventListener("click", toggleTheme);

// Toggle dark/light theme
function toggleTheme() {
  state.isDarkMode = !state.isDarkMode;

  document.body.classList.toggle("dark-theme", state.isDarkMode);

  themeToggle.innerHTML = state.isDarkMode
    ? '<i class="fas fa-sun"></i>'
    : '<i class="fas fa-moon"></i>';

  localStorage.setItem("weatherDarkMode", state.isDarkMode);
}

// Event Listeners
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();

  if (city) {
    getWeather(city);
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();

    if (city) {
      getWeather(city);
    }
  }
});

// Display current weather and forecast
async function getWeather(city) {
  showLoading();

  try {
    // Get current weather
    const currentWeather = await getCurrentWeather(city);

    // Get forecast using coordinates from current weather
    const forecastData = await getForecast(
      currentWeather.coord.lat,
      currentWeather.coord.lon
    );

    console.log(currentWeather, forecastData);
  } catch (error) {
    showError(error.message || "Failed to fetch weather data");
  }
}

// Get current weather data
async function getCurrentWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPEN_WEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.cod === "404") {
      throw new Error("City not found");
    }

    return data;
  } catch (error) {
    throw error;
  }
}

// Get 5-day forecast data
async function getForecast(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${OPEN_WEATHER_API_KEY}&units=metric`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    throw error;
  }
}

// Show loading indicator
function showLoading() {
  loading.style.display = "flex";
  errorContainer.style.display = "none";
  weatherData.style.display = "none";
}

// Show error message
function showError(message) {
  loading.style.display = "none";
  errorContainer.style.display = "flex";
  weatherData.style.display = "none";
  errorMessage.textContent = message;
}
