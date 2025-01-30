// Replace with your actual Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1Ijoic2VyZ2lvMzciLCJhIjoiY202ajVneHJsMGdhbDJsczNsN29kOGhkYyJ9.zrcQNkag1X8lSVzwoa3XTQ';

// Initialize the Mapbox map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12', // Choose your preferred map style
  center: [0, 20], // Initial map center [lng, lat]
  zoom: 2
});

// Initialize variables
let primaryMarker = null;
let primaryCoords = null;
const comparisonMarkers = [];
const comparisonLayers = [];

// Debounce function to limit the rate of API calls
function debounce(func, delay) {
  let debounceTimer;
  return function(...args) {
    const context = this;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
}

// Function to fetch suggestions from Nominatim
async function fetchSuggestions(query) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
}

// Function to render suggestions
function renderSuggestions(suggestions, suggestionBox, inputField) {
  suggestionBox.innerHTML = '';
  if (suggestions.length === 0) {
    const noResult = document.createElement('div');
    noResult.classList.add('suggestion-item');
    noResult.textContent = 'No results found';
    suggestionBox.appendChild(noResult);
    return;
  }
  suggestions.forEach(suggestion => {
    const div = document.createElement('div');
    div.classList.add('suggestion-item');
    div.textContent = suggestion.display_name;
    div.addEventListener('click', () => {
      inputField.value = suggestion.display_name;
      suggestionBox.innerHTML = '';
    });
    suggestionBox.appendChild(div);
  });
}

// Add event listener for autocomplete on comparison input
document.getElementById('comparison-input').addEventListener('input', debounce(async function() {
  const query = this.value.trim();
  const suggestionBox = document.getElementById('comparison-suggestions');
  if (query.length < 3) {
    suggestionBox.innerHTML = '';
    return;
  }
  const suggestions = await fetchSuggestions(query);
  renderSuggestions(suggestions, suggestionBox, this);
}, 300));

// Function to geocode a location using Nominatim
async function geocode(location) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name
      };
    } else {
      alert(`Location not found: ${location}`);
      return null;
    }
  } catch (error) {
    console.error('Error during geocoding:', error);
    alert('An error occurred while searching for the location.');
    return null;
  }
}

// Function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(coord1, coord2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lon - coord1.lon) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(2); // in kilometers
}

// Function to sort comparison locations by distance
function sortComparisons() {
  // Create an array of objects containing marker, layer, list item, and distance
  const comparisons = comparisonMarkers.map((marker, index) => {
    const coords = marker.getLngLat();
    const distance = parseFloat(calculateDistance(primaryCoords, { lat: coords.lat, lon: coords.lng }));
    const listItem = document.querySelectorAll('#comparison-list li')[index];
    return { marker, layer: comparisonLayers[index], listItem, distance };
  });

  // Sort the array based on distance
  comparisons.sort((a, b) => a.distance - b.distance);

  // Clear the existing list
  const comparisonList = document.getElementById('comparison-list');
  comparisonList.innerHTML = '';

  // Re-add the list items in sorted order
  comparisons.forEach(comp => {
    comparisonList.appendChild(comp.listItem);
  });
}

// Function to set Primary Location based on preset
async function setPrimaryLocation(location) {
  if (!location) {
    alert('Please select a preset location.');
    return;
  }
  const result = await geocode(location);
  if (result) {
    primaryCoords = { lat: result.lat, lon: result.lon };
    
    // Remove existing primary marker if any
    if (primaryMarker) {
      primaryMarker.remove();
    }

    // Add new primary marker
    primaryMarker = new mapboxgl.Marker({ color: 'red' })
      .setLngLat([primaryCoords.lon, primaryCoords.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<b>Primary Location:</b><br>${result.display_name}`))
      .addTo(map)
      .togglePopup();

    // Center map on primary location
    map.flyTo({
      center: [primaryCoords.lon, primaryCoords.lat],
      zoom: 10,
      essential: true
    });

    // Update distances for existing comparison locations
    updateDistances();

    // Sort comparison locations after updating distances
    sortComparisons();
  }
}

// Event Listener for Set Preset Location Button
document.getElementById('set-preset').addEventListener('click', () => {
  const presetDropdown = document.getElementById('presets-dropdown');
  const selectedPreset = presetDropdown.value;
  if (selectedPreset) {
    setPrimaryLocation(selectedPreset);
    presetDropdown.selectedIndex = 0; // Reset dropdown to default
  } else {
    alert('Please select a preset location.');
  }
});

// Event Listener for Add Comparison Location Button
document.getElementById('add-comparison').addEventListener('click', async () => {
  const location = document.getElementById('comparison-input').value.trim();
  if (!location) {
    alert('Please enter a comparison location.');
    return;
  }
  const result = await geocode(location);
  if (result && primaryCoords) {
    // Check for duplicate locations
    const exists = comparisonMarkers.some(marker => marker.getLngLat().lat === result.lat && marker.getLngLat().lng === result.lon);
    if (exists) {
      alert('This location is already added as a comparison.');
      return;
    }

    // Create list item
    const li = document.createElement('li');

    const locationDiv = document.createElement('div');
    locationDiv.textContent = result.display_name;

    const distanceSpan = document.createElement('span');
    distanceSpan.textContent = `Distance: Calculating... km`;

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';

    li.appendChild(locationDiv);
    li.appendChild(distanceSpan);
    li.appendChild(removeBtn);

    document.getElementById('comparison-list').appendChild(li);

    // Add comparison marker
    const marker = new mapboxgl.Marker({ color: 'blue' })
      .setLngLat([result.lon, result.lat])
      .setPopup(new mapboxgl.Popup().setHTML(`<b>Comparison Location:</b><br>${result.display_name}`))
      .addTo(map);
    comparisonMarkers.push(marker);

    // Draw line between primary and comparison location using GeoJSON
    const geojson = {
      'type': 'Feature',
      'geometry': {
        'type': 'LineString',
        'coordinates': [
          [primaryCoords.lon, primaryCoords.lat],
          [result.lon, result.lat]
        ]
      }
    };

    if (!map.getSource('comparison-lines')) {
      map.addSource('comparison-lines', {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': [geojson]
        }
      });
      map.addLayer({
        'id': 'comparison-lines',
        'type': 'line',
        'source': 'comparison-lines',
        'layout': {},
        'paint': {
          'line-color': '#888',
          'line-width': 2
        }
      });
    } else {
      // If the source already exists, append the new line
      const existingData = map.getSource('comparison-lines')._data;
      existingData.features.push(geojson);
      map.getSource('comparison-lines').setData(existingData);
    }

    // Note: comparisonLayers are not used in this Mapbox implementation since lines are managed via GeoJSON

    // Calculate distance
    const distance = calculateDistance(primaryCoords, { lat: result.lat, lon: result.lon });
    distanceSpan.textContent = `Distance: ${distance} km`;

    // Remove functionality
    removeBtn.addEventListener('click', () => {
      // Remove marker
      marker.remove();
      const index = comparisonMarkers.indexOf(marker);
      if (index > -1) {
        comparisonMarkers.splice(index, 1);
        // Remove corresponding line from GeoJSON
        const source = map.getSource('comparison-lines');
        if (source) {
          const data = source._data;
          data.features.splice(index, 1);
          source.setData(data);
        }
      }

      // Remove list item
      document.getElementById('comparison-list').removeChild(li);

      // Sort the comparison list after removal
      sortComparisons();
    });

    // Sort the comparison list after adding a new location
    sortComparisons();

    // Clear input and suggestions
    document.getElementById('comparison-input').value = '';
    document.getElementById('comparison-suggestions').innerHTML = '';
  } else if (!primaryCoords) {
    alert('Please set the primary location first using the presets.');
  }
});

// Function to update distances when primary location changes
function updateDistances() {
  comparisonMarkers.forEach((marker, index) => {
    const coords = marker.getLngLat();
    const distance = calculateDistance(primaryCoords, { lat: coords.lat, lon: coords.lng });
    const listItem = document.querySelectorAll('#comparison-list li')[index];
    if (listItem) {
      const distanceSpan = listItem.querySelector('span');
      distanceSpan.textContent = `Distance: ${distance} km`;
    }

    // Update corresponding line in GeoJSON
    const source = map.getSource('comparison-lines');
    if (source) {
      const data = source._data;
      if (data.features[index]) {
        data.features[index].geometry.coordinates = [
          [primaryCoords.lon, primaryCoords.lat],
          [coords.lng, coords.lat]
        ];
        source.setData(data);
      }
    }
  });
}

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
  const comparisonSuggestions = document.getElementById('comparison-suggestions');
  if (!document.getElementById('comparison-input').contains(event.target)) {
    comparisonSuggestions.innerHTML = '';
  }
});
