const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const cityInput = document.getElementById("city");
const regionInput = document.getElementById("region");
const countryInput = document.getElementById("country");
const button = document.getElementById("get-weather");
const errorBox = document.getElementById("error");
const weatherBox = document.getElementById("weather");

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function showError(message) {
  weatherBox.hidden = true;
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}

async function getCoordinates(city, region, country) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=100&language=en&format=json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding request failed (status ${response.status}).`);
  }

  const data = await response.json();
  const results = data.results || [];

  const wantedRegion = normalize(region);
  const wantedCountry = normalize(country);

  const match = results.find((place) => {
    const placeRegion = normalize(place.admin1 || "");
    const placeCountry = normalize(place.country || "");
    const placeCode = normalize(place.country_code || "");
    return (
      placeRegion === wantedRegion &&
      (placeCountry === wantedCountry || placeCode === wantedCountry)
    );
  });

  if (!match) {
    throw new Error(
      `Location not found: ${city}, ${region}, ${country}. Check the spelling and try again.`
    );
  }

  return {
    latitude: match.latitude,
    longitude: match.longitude,
    name: `${match.name}, ${match.admin1}, ${match.country}`,
  };
}

async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,apparent_temperature,wind_speed_10m,relative_humidity_2m",
    wind_speed_unit: "kmh",
    temperature_unit: "celsius",
  });

  const response = await fetch(`${WEATHER_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Weather request failed (status ${response.status}).`);
  }

  const data = await response.json();
  if (!data.current) {
    throw new Error("Weather data is not available for this location.");
  }
  return data;
}

function displayWeather(locationName, data) {
  const { current, current_units: units } = data;

  document.getElementById("location").textContent = locationName;
  document.getElementById("temperature").textContent =
    `${current.temperature_2m}${units?.temperature_2m ?? "°C"}`;
  document.getElementById("apparent").textContent =
    `${current.apparent_temperature}${units?.apparent_temperature ?? "°C"}`;
  document.getElementById("wind").textContent =
    `${current.wind_speed_10m} ${units?.wind_speed_10m ?? "km/h"}`;
  document.getElementById("humidity").textContent =
    `${current.relative_humidity_2m}${units?.relative_humidity_2m ?? "%"}`;

  weatherBox.hidden = false;
}

async function handleSearch() {
  const city = cityInput.value.trim();
  const region = regionInput.value.trim();
  const country = countryInput.value.trim();

  clearError();

  button.disabled = true;
  try {
    if (!city || !region || !country) {
      throw new Error("Please fill in the city, province/state, and country.");
    }

    const location = await getCoordinates(city, region, country);
    const weather = await getWeather(location.latitude, location.longitude);
    displayWeather(location.name, weather);
  } catch (error) {
    if (error instanceof TypeError) {
      showError("Network error. Check your connection and try again.");
    } else {
      showError(error.message);
    }
  } finally {
    button.disabled = false;
  }
}

button.addEventListener("click", handleSearch);
