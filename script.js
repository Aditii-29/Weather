// API Configuration
const API_KEY = '68c263ce78dc7295fdde6bbe669dc575'; 
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const locationInput = document.getElementById('location-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const cityName = document.getElementById('city-name');
const currentDate = document.getElementById('current-date');
const weatherIcon = document.getElementById('weather-icon');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weather-description');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('wind-speed');
const pressure = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecast');
const suggestionsContainer = document.createElement('div');
suggestionsContainer.id = 'suggestions-container';
locationInput.parentNode.appendChild(suggestionsContainer);

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Try to get weather for user's current location on load
    getLocationWeather();
    
    // Set up event listeners
    searchBtn.addEventListener('click', searchWeather);
    locationInput.addEventListener('input', debounce(handleInput, 300));
    locationInput.addEventListener('keypress', (e) => e.key === 'Enter' && searchWeather());
    locationBtn.addEventListener('click', getLocationWeather);
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!locationInput.contains(e.target)) {
            suggestionsContainer.style.display = 'none';
        }
    });
});

// Debounce function for input events
function debounce(func, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, arguments), delay);
    };
}

// Handle search button click or Enter key
function searchWeather() {
    const location = locationInput.value.trim();
    if (location) {
        getWeatherByLocation(location);
        suggestionsContainer.style.display = 'none';
    }
}

// Handle input for city suggestions
async function handleInput() {
    const query = locationInput.value.trim();
    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${GEO_URL}/direct?q=${query}&limit=5&appid=${API_KEY}`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const cities = await response.json();
        showSuggestions(cities);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.style.display = 'none';
    }
}

// Get weather by location name
async function getWeatherByLocation(location) {
    try {
        // Get current weather
        const currentResponse = await fetch(`${BASE_URL}/weather?q=${location}&units=metric&appid=${API_KEY}`);
        if (!currentResponse.ok) {
            const errorData = await currentResponse.json();
            throw new Error(errorData.message || 'City not found. Please check the spelling.');
        }
        
        const currentData = await currentResponse.json();
        
        // Verify we have the expected data
        if (!currentData.weather || !currentData.main) {
            throw new Error('Invalid weather data received');
        }
        
        // Get forecast
        const forecastResponse = await fetch(`${BASE_URL}/forecast?q=${location}&units=metric&appid=${API_KEY}`);
        if (!forecastResponse.ok) {
            throw new Error('Could not fetch forecast data');
        }
        const forecastData = await forecastResponse.json();
        
        updateWeatherUI(currentData, forecastData);
    } catch (error) {
        alert(error.message);
        console.error('Error:', error);
    }
}

// Get weather by geolocation
function getLocationWeather() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Get current weather
                    const currentResponse = await fetch(`${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`);
                    if (!currentResponse.ok) {
                        throw new Error('Could not fetch weather data');
                    }
                    const currentData = await currentResponse.json();
                    
                    // Get forecast
                    const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`);
                    if (!forecastResponse.ok) {
                        throw new Error('Could not fetch forecast data');
                    }
                    const forecastData = await forecastResponse.json();
                    
                    updateWeatherUI(currentData, forecastData);
                    locationInput.value = currentData.name;
                } catch (error) {
                    alert(error.message);
                    console.error('Error:', error);
                }
            },
            (error) => {
                alert('Please enable location access to get weather for your current location.');
                console.error('Geolocation error:', error);
            }
        );
    } else {
        alert('Geolocation is not supported by your browser. Please enter a location manually.');
    }
}

// Update the UI with weather data
function updateWeatherUI(currentData, forecastData) {
    try {
        // Update current weather
        const locationName = currentData.name || 'Unknown location';
        const country = currentData.sys?.country || '';
        cityName.textContent = country ? `${locationName}, ${country}` : locationName;
        
        const now = new Date();
        currentDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        temperature.textContent = `${Math.round(currentData.main.temp)}°C`;
        weatherDescription.textContent = currentData.weather[0].description || 'N/A';
        humidity.textContent = `${currentData.main.humidity}%`;
        windSpeed.textContent = `${Math.round(currentData.wind.speed * 3.6)} km/h`;
        pressure.textContent = `${currentData.main.pressure} hPa`;
        
        // Update weather icon
        const weatherCode = currentData.weather[0].id;
        const iconClass = getWeatherIconClass(weatherCode);
        weatherIcon.innerHTML = `<i class="wi ${iconClass}"></i>`;
        
        // Update forecast if available
        if (forecastData?.list) {
            updateForecast(forecastData);
        }
    } catch (error) {
        console.error('Error updating UI:', error);
        alert('Error displaying weather data. Please try again.');
    }
}

// Update forecast data
function updateForecast(forecastData) {
    try {
        forecastContainer.innerHTML = '';
        
        // Filter to get one forecast per day at noon (or closest available)
        const dailyForecasts = [];
        const daysProcessed = new Set();
        
        forecastData.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            const hours = date.getHours();
            
            if (!daysProcessed.has(day) && hours >= 10 && hours <= 14) {
                daysProcessed.add(day);
                dailyForecasts.push({
                    day,
                    temp: Math.round(item.main.temp),
                    icon: getWeatherIconClass(item.weather[0]?.id || 800)
                });
            }
        });
        
        // Display next 5 days
        dailyForecasts.slice(0, 5).forEach(forecast => {
            const forecastItem = document.createElement('div');
            forecastItem.className = 'forecast-item';
            forecastItem.innerHTML = `
                <div class="forecast-day">${forecast.day}</div>
                <div class="forecast-icon"><i class="wi ${forecast.icon}"></i></div>
                <div class="forecast-temp">${forecast.temp}°C</div>
            `;
            forecastContainer.appendChild(forecastItem);
        });
    } catch (error) {
        console.error('Error updating forecast:', error);
        forecastContainer.innerHTML = '<div class="forecast-error">Forecast unavailable</div>';
    }
}

// Map weather codes to Weather Icons classes
function getWeatherIconClass(weatherCode) {
    if (!weatherCode) return 'wi-day-sunny';
    
    if (weatherCode >= 200 && weatherCode < 300) return 'wi-thunderstorm';
    if (weatherCode >= 300 && weatherCode < 400) return 'wi-sprinkle';
    if (weatherCode >= 500 && weatherCode < 600) return 'wi-rain';
    if (weatherCode >= 600 && weatherCode < 700) return 'wi-snow';
    if (weatherCode >= 700 && weatherCode < 800) return 'wi-fog';
    if (weatherCode === 800) return 'wi-day-sunny';
    if (weatherCode === 801) return 'wi-day-cloudy';
    if (weatherCode > 801 && weatherCode < 900) return 'wi-cloudy';
    
    return 'wi-day-sunny';
}