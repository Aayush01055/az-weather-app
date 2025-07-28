import OPEN_WEATHER_API_KEY from "./apiKey.js";

// DOM Elements
const cityInput = document.getElementById("city");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const suggestionsDropdown = document.getElementById("suggestions-dropdown");
const suggestionsList = document.getElementById("suggestions-list");
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
  selectedSuggestionIndex: -1,
  suggestionTimeout: null,
};

// Common cities for instant suggestions
const popularCities = [
  { name: "Los Angeles", state: "California", country: "US" },
  { name: "New York", state: "New York", country: "US" },
  { name: "San Francisco", state: "California", country: "US" },
  { name: "Las Vegas", state: "Nevada", country: "US" },
  { name: "San Diego", state: "California", country: "US" },
  { name: "San Antonio", state: "Texas", country: "US" },
  { name: "New Orleans", state: "Louisiana", country: "US" },
  { name: "San Jose", state: "California", country: "US" },
  { name: "Los Vegas", state: "Nevada", country: "US" },
  { name: "Salt Lake City", state: "Utah", country: "US" },
  { name: "Buenos Aires", state: "", country: "AR" },
  { name: "Mexico City", state: "", country: "MX" },
  { name: "Costa Rica", state: "", country: "CR" },
  { name: "New Delhi", state: "", country: "IN" },
  { name: "Hong Kong", state: "", country: "HK" },
  { name: "Cape Town", state: "", country: "ZA" },
  { name: "Rio de Janeiro", state: "", country: "BR" },
  { name: "São Paulo", state: "", country: "BR" }
];

// Initialize theme
if (state.isDarkMode) {
  document.body.classList.add("dark-theme");
  themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
}

themeToggle.addEventListener("click", toggleTheme);
locationBtn.addEventListener("click", getWeatherByLocation);

// Get weather by geolocation
async function getWeatherByLocation() {
  showLoading();

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          // Get city name from coordinates
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${OPEN_WEATHER_API_KEY}`
          );

          const data = await response.json();

          if (data.length > 0) {
            const city = data[0].name;
            cityInput.value = city;
            getWeather(city);
          } else {
            throw new Error("Location not found");
          }
        } catch (error) {
          showError(error.message || "Failed to get location");
        }
      },
      () => {
        showError("Geolocation permission denied. Please search manually.");
      }
    );
  } else {
    showError("Geolocation not supported by this browser");
  }
}

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
    hideSuggestions();
  }
});

cityInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    
    if (state.selectedSuggestionIndex >= 0) {
      // Select the highlighted suggestion from filtered list
      const suggestions = suggestionsList.querySelectorAll('.suggestion-item:not(.loading):not(.no-results)');
      if (suggestions[state.selectedSuggestionIndex]) {
        suggestions[state.selectedSuggestionIndex].click();
      }
    } else {
      // Use the typed value
      const city = cityInput.value.trim();
      if (city) {
        getWeather(city);
        hideSuggestions();
      }
    }
  }
});

// Add keydown event listener for arrow navigation
cityInput.addEventListener("keydown", (e) => {
  const suggestions = suggestionsList.querySelectorAll('.suggestion-item:not(.loading):not(.no-results)');
  
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (suggestions.length > 0) {
      state.selectedSuggestionIndex = Math.min(state.selectedSuggestionIndex + 1, suggestions.length - 1);
      updateSuggestionHighlight();
    }
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (suggestions.length > 0) {
      state.selectedSuggestionIndex = Math.max(state.selectedSuggestionIndex - 1, -1);
      updateSuggestionHighlight();
    }
  } else if (e.key === "Escape") {
    hideSuggestions();
  }
});

// Add input event listener for suggestions
cityInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  
  // Clear existing timeout
  if (state.suggestionTimeout) {
    clearTimeout(state.suggestionTimeout);
  }
  
  if (query.length > 1) {
    // Show instant local suggestions first
    const localSuggestions = getInstantSuggestions(query);
    if (localSuggestions.length > 0) {
      displaySuggestions(localSuggestions, true); // true indicates local suggestions
    } else if (query.length > 3) {
      showLoadingSuggestions();
    }
    
    // Then fetch from API with minimal delay
    const debounceTime = query.includes(' ') ? 50 : 100; // Even shorter delay
    state.suggestionTimeout = setTimeout(() => {
      fetchCitySuggestions(query);
    }, debounceTime);
  } else {
    hideSuggestions();
  }
});

// Get instant suggestions from local popular cities list
function getInstantSuggestions(query) {
  const lowerQuery = query.toLowerCase();
  return popularCities.filter(city => 
    city.name.toLowerCase().startsWith(lowerQuery) ||
    city.name.toLowerCase().includes(' ' + lowerQuery) ||
    (lowerQuery.includes(' ') && city.name.toLowerCase().includes(lowerQuery))
  ).slice(0, 3); // Limit to 3 instant suggestions
}

// Hide suggestions when clicking outside
document.addEventListener("click", (e) => {
  if (!cityInput.contains(e.target) && !suggestionsDropdown.contains(e.target)) {
    hideSuggestions();
  }
});

// Fetch city suggestions from OpenWeather Geocoding API
async function fetchCitySuggestions(query) {
  try {
    // Clean and format the query
    const cleanQuery = query.trim().replace(/\s+/g, ' ');
    
    // For space-separated queries, try multiple approaches simultaneously
    if (cleanQuery.includes(' ')) {
      const promises = [
        // Original space-separated query
        fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanQuery)}&limit=10&appid=${OPEN_WEATHER_API_KEY}`),
        // Comma-separated query
        fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanQuery.replace(/\s+/g, ','))}&limit=10&appid=${OPEN_WEATHER_API_KEY}`)
      ];
      
      const responses = await Promise.allSettled(promises);
      let cities = [];
      
      // Try to get results from any successful response
      for (const response of responses) {
        if (response.status === 'fulfilled' && response.value.ok) {
          const data = await response.value.json();
          if (data.length > 0) {
            cities = data;
            break;
          }
        }
      }
      
      // Remove duplicates within API results
      cities = removeDuplicateCities(cities);
      displaySuggestions(cities);
    } else {
      // Single word query - use original approach
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(cleanQuery)}&limit=10&appid=${OPEN_WEATHER_API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      let cities = await response.json();
      // Remove duplicates within API results
      cities = removeDuplicateCities(cities);
      displaySuggestions(cities);
    }
  } catch (error) {
    console.error('Error fetching city suggestions:', error);
    hideSuggestions();
  }
}

// Remove duplicate cities from API results
function removeDuplicateCities(cities) {
  const seen = new Set();
  return cities.filter(city => {
    // Create a unique key based on city name and country
    const key = `${city.name.toLowerCase()}-${city.country.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  }).slice(0, 5); // Limit to 5 results
}

// Display city suggestions in dropdown
function displaySuggestions(cities, isLocal = false) {
  // Don't replace local suggestions with empty API results
  if (!isLocal && cities.length === 0 && suggestionsList.children.length > 0) {
    return;
  }
  
  // If this is API results and we already have local suggestions, merge and remove duplicates
  if (!isLocal && suggestionsList.children.length > 0) {
    const existingCities = Array.from(suggestionsList.querySelectorAll('.suggestion-name')).map(el => el.textContent.toLowerCase());
    cities = cities.filter(city => {
      const cityKey = city.name.toLowerCase();
      return !existingCities.includes(cityKey);
    });
    
    // If no new cities to add, don't update
    if (cities.length === 0) {
      return;
    }
    
    // Add new API results to existing local suggestions
    cities.forEach((city, index) => {
      const suggestionItem = document.createElement('div');
      suggestionItem.className = 'suggestion-item';
      
      const cityName = document.createElement('div');
      cityName.className = 'suggestion-name';
      cityName.textContent = city.name;
      
      const countryName = document.createElement('div');
      countryName.className = 'suggestion-country';
      countryName.textContent = `${city.state ? city.state + ', ' : ''}${city.country}`;
      
      suggestionItem.appendChild(cityName);
      suggestionItem.appendChild(countryName);
      
      suggestionItem.addEventListener('click', () => {
        cityInput.value = city.name;
        getWeather(city.name);
        hideSuggestions();
      });

      suggestionItem.addEventListener('mouseenter', () => {
        const allSuggestions = suggestionsList.querySelectorAll('.suggestion-item:not(.loading):not(.no-results)');
        state.selectedSuggestionIndex = Array.from(allSuggestions).indexOf(suggestionItem);
        updateSuggestionHighlight();
      });
      
      suggestionsList.appendChild(suggestionItem);
    });
    
    return;
  }
  
  suggestionsList.innerHTML = '';
  state.selectedSuggestionIndex = -1;

  if (cities.length === 0) {
    // Show "No results found" message only if it's not local suggestions
    if (!isLocal) {
      const noResultsItem = document.createElement('div');
      noResultsItem.className = 'suggestion-item no-results';
      noResultsItem.innerHTML = `
        <div class="suggestion-name">No cities found</div>
        <div class="suggestion-country">Try a different spelling or check your input</div>
      `;
      suggestionsList.appendChild(noResultsItem);
      showSuggestions();
    }
    return;
  }

  cities.forEach((city, index) => {
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'suggestion-item';
    if (isLocal) suggestionItem.classList.add('local-suggestion');
    
    const cityName = document.createElement('div');
    cityName.className = 'suggestion-name';
    cityName.textContent = city.name;
    
    const countryName = document.createElement('div');
    countryName.className = 'suggestion-country';
    countryName.textContent = `${city.state ? city.state + ', ' : ''}${city.country}`;
    
    suggestionItem.appendChild(cityName);
    suggestionItem.appendChild(countryName);
    
    suggestionItem.addEventListener('click', () => {
      cityInput.value = city.name;
      getWeather(city.name);
      hideSuggestions();
    });

    suggestionItem.addEventListener('mouseenter', () => {
      state.selectedSuggestionIndex = index;
      updateSuggestionHighlight();
    });
    
    suggestionsList.appendChild(suggestionItem);
  });

  showSuggestions();
}

// Update suggestion highlighting
function updateSuggestionHighlight() {
  const suggestions = suggestionsList.querySelectorAll('.suggestion-item:not(.loading):not(.no-results)');
  
  suggestions.forEach((item, index) => {
    if (index === state.selectedSuggestionIndex) {
      item.classList.add('highlighted');
    } else {
      item.classList.remove('highlighted');
    }
  });
}

// Show loading indicator for suggestions
function showLoadingSuggestions() {
  suggestionsList.innerHTML = '';
  const loadingItem = document.createElement('div');
  loadingItem.className = 'suggestion-item loading';
  loadingItem.innerHTML = `
    <div class="suggestion-name">Searching cities...</div>
    <div class="suggestion-country">Please wait</div>
  `;
  suggestionsList.appendChild(loadingItem);
  showSuggestions();
}

// Show suggestions dropdown
function showSuggestions() {
  if (suggestionsDropdown) {
    suggestionsDropdown.style.display = 'block';
  }
}

// Hide suggestions dropdown
function hideSuggestions() {
  suggestionsDropdown.style.display = 'none';
  state.selectedSuggestionIndex = -1;
}

// Display current weather and forecast
async function getWeather(city) {
  showLoading();

  try {
    // Get current weather
    const currentWeather = await getCurrentWeather(city);

    // Add to search history
    addToSearchHistory(currentWeather.name);

    // Get forecast using coordinates from current weather
    const forecastData = await getForecast(
      currentWeather.coord.lat,
      currentWeather.coord.lon
    );

    // Process and display the data
    displayWeather(currentWeather, forecastData);
  } catch (error) {
    showError(error.message || "Failed to fetch weather data");
  }
}

// Add city to search history
function addToSearchHistory(city) {
  // Remove city if it already exists in history
  state.weatherHistory = state.weatherHistory.filter(
    (item) => item.toLowerCase() !== city.toLowerCase()
  );

  // Add city to the beginning of the history array
  state.weatherHistory.unshift(city);

  // Limit history to 5 items
  if (state.weatherHistory.length > 5) {
    state.weatherHistory.pop();
  }

  // Save to localStorage
  localStorage.setItem("weatherHistory", JSON.stringify(state.weatherHistory));

  // Update UI
  updateSearchHistory();
}

// Update search history UI
function updateSearchHistory() {
  historyItems.innerHTML = "";

  state.weatherHistory.forEach((city) => {
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.textContent = city;

    historyItem.addEventListener("click", () => {
      cityInput.value = city;
      getWeather(city);
    });

    historyItems.appendChild(historyItem);
  });
}

// Process and display the weather data
function displayWeather(currentData, forecastData) {
  // Display current weather
  cityName.textContent = `${currentData.name}, ${currentData.sys.country}`;
  currentDate.textContent = formatDate(currentData.dt);
  weatherIconMain.innerHTML = getWeatherIcon(currentData.weather[0].id);
  temperature.textContent = `${Math.round(currentData.main.temp)}°C`;
  weatherDescription.textContent = currentData.weather[0].description;
  feelsLike.textContent = `${Math.round(currentData.main.feels_like)}°C`;
  wind.textContent = `${currentData.wind.speed} m/s`;
  humidity.textContent = `${currentData.main.humidity}%`;
  pressure.textContent = `${currentData.main.pressure} hPa`;
  visibility.textContent = `${(currentData.visibility / 1000).toFixed(1)} km`;

  // Apply weather theme
  const themeClass = getWeatherTheme(currentData.weather[0].id);
  const currentWeatherElement = document.querySelector(".current-weather");
  currentWeatherElement.className = "current-weather";

  if (themeClass) {
    currentWeatherElement.classList.add(themeClass);
  }

  // Display 5-day forecast
  displayForecast(forecastData);

  // Show the weather data section
  showWeatherData();
}

// Show weather data
function showWeatherData() {
  loading.style.display = "none";
  errorContainer.style.display = "none";
  weatherData.style.display = "block";
}

// Display the 5-day forecast
function displayForecast(forecastData) {
  forecastItems.innerHTML = "";

  // Process forecast data (one forecast per day)
  const dailyForecasts = {};

  forecastData.list.forEach((forecast) => {
    const date = new Date(forecast.dt * 1000);
    const day = date.toDateString();

    if (date.getDate() !== new Date().getDate()) {
      dailyForecasts[day] = forecast;
    }
  });

  // Display up to 5 forecasts
  Object.values(dailyForecasts).forEach((forecast) => {
    const forecastItem = document.createElement("div");
    forecastItem.className = "forecast-item";

    const forecastDate = new Date(forecast.dt * 1000);
    const day = formatDay(forecast.dt);
    const date = forecastDate.getDate() + "/" + (forecastDate.getMonth() + 1);

    forecastItem.innerHTML = `
        <div class="forecast-day">${day}</div>
        <div class="forecast-date">${date}</div>
        <div class="forecast-icon">${getWeatherIcon(
          forecast.weather[0].id
        )}</div>
        <div class="forecast-temp">${Math.round(forecast.main.temp)}°C</div>
        <div class="forecast-description">${
          forecast.weather[0].description
        }</div>
      `;

    forecastItems.appendChild(forecastItem);
  });
}

// Format day
function formatDay(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// Get weather theme class based on weather condition
function getWeatherTheme(weatherId) {
  if (weatherId >= 200 && weatherId < 300) {
    return "weather-theme-thunderstorm";
  } else if (weatherId >= 500 && weatherId < 600) {
    return "weather-theme-rain";
  } else if (weatherId >= 600 && weatherId < 700) {
    return "weather-theme-snow";
  } else if (weatherId === 800) {
    return "weather-theme-clear";
  } else if (weatherId > 800) {
    return "weather-theme-clouds";
  }

  return "";
}

// Get weather icon class based on weather condition
function getWeatherIcon(weatherId) {
  if (weatherId >= 200 && weatherId < 300) {
    return '<i class="fas fa-bolt"></i>'; // Thunderstorm
  } else if (weatherId >= 300 && weatherId < 400) {
    return '<i class="fas fa-cloud-rain"></i>'; // Drizzle
  } else if (weatherId >= 500 && weatherId < 600) {
    return '<i class="fas fa-cloud-showers-heavy"></i>'; // Rain
  } else if (weatherId >= 600 && weatherId < 700) {
    return '<i class="fas fa-snowflake"></i>'; // Snow
  } else if (weatherId >= 700 && weatherId < 800) {
    return '<i class="fas fa-smog"></i>'; // Atmosphere
  } else if (weatherId === 800) {
    return '<i class="fas fa-sun"></i>'; // Clear
  } else {
    return '<i class="fas fa-cloud"></i>'; // Clouds
  }
}

// Format date
function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);

  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return date.toLocaleDateString("en-US", options);
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
