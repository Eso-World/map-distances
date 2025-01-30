// Initialize the map
const map = L.map('map').setView([20, 0], 2); // World view

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// State Variables
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
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`, {
      headers: {
        'User-Agent': 'MapDistanceCalculator/1.0 (your-email@example.com)'
      }
    });
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

// Add event listeners for autocomplete
document.getElementById('primary-location').addEventListener('input', debounce(async function() {
  const query = this.value.trim();
  const suggestionBox = document.getElementById('primary-suggestions');
  if (query.length < 3) {
    suggestionBox.innerHTML = '';
    return;
  }
  const suggestions = await fetchSuggestions(query);
  renderSuggestions(suggestions, suggestionBox, this);
}, 300));

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
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`, {
      headers: {
        'User-Agent': 'MapDistanceCalculator/1.0 (your-email@example.com)'
      }
    });
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
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(2); // in kilometers
}

// Helper function to create a list item
function createListItem(location, distance, marker, line) {
  const li = document.createElement('li');
  li.textContent = location.display_name;
  li.setAttribute('data-distance', distance); // Set data-distance attribute

  const distanceSpan = document.createElement('span');
  distanceSpan.textContent = `Distance: ${distance} km`;
  li.appendChild(distanceSpan);

  const removeBtn = document.createElement('button');
  removeBtn.textContent = 'Remove';
  li.appendChild(removeBtn);

  // Remove functionality
  removeBtn.addEventListener('click', () => {
    map.removeLayer(marker);
    map.removeLayer(line);
    document.getElementById('comparison-list').removeChild(li);
    const index = comparisonMarkers.indexOf(marker);
    if (index > -1) {
      comparisonMarkers.splice(index, 1);
      comparisonLayers.splice(index, 1);
    }
    adjustMapView();
  });

  return li;
}

// Function to insert list item in sorted order
function insertListItemSorted(li) {
  const list = document.getElementById('comparison-list');
  const distance = parseFloat(li.getAttribute('data-distance'));
  const items = list.getElementsByTagName('li');

  for (let i = 0; i < items.length; i++) {
    const currentDistance = parseFloat(items[i].getAttribute('data-distance'));
    if (distance < currentDistance) {
      list.insertBefore(li, items[i]);
      return;
    }
  }
  // If not inserted yet, append at the end
  list.appendChild(li);
}

// Set Primary Location
document.getElementById('set-primary').addEventListener('click', async () => {
  const location = document.getElementById('primary-location').value.trim();
  if (!location) {
    alert('Please enter a primary location.');
    return;
  }
  const result = await geocode(location);
  if (result) {
    primaryCoords = { lat: result.lat, lon: result.lon };
    if (primaryMarker) {
      map.removeLayer(primaryMarker);
    }
    primaryMarker = L.marker([primaryCoords.lat, primaryCoords.lon], { color: 'red' })
      .addTo(map)
      .bindPopup(`<b>Primary Location:</b><br>${result.display_name}`)
      .openPopup();
    map.setView([primaryCoords.lat, primaryCoords.lon], 10);

    // Update distances for existing comparison locations
    updateDistances();
  }
});

// Add Comparison Location
document.getElementById('add-comparison').addEventListener('click', async () => {
  const location = document.getElementById('comparison-input').value.trim();
  if (!location) {
    alert('Please enter a comparison location.');
    return;
  }
  const result = await geocode(location);
  if (result && primaryCoords) {
    // Check for duplicate locations
    const exists = comparisonMarkers.some(marker => {
      const markerPos = marker.getLatLng();
      return markerPos.lat === result.lat && markerPos.lng === result.lon;
    });
    if (exists) {
      alert('This location is already added as a comparison.');
      return;
    }

    // Calculate distance
    const distance = calculateDistance(primaryCoords, { lat: result.lat, lon: result.lon });

    // Create marker
    const marker = L.marker([result.lat, result.lon], { color: 'blue' }).addTo(map)
      .bindPopup(`<b>Comparison Location:</b><br>${result.display_name}`);
    comparisonMarkers.push(marker);

    // Draw line
    const line = L.polyline([
      [primaryCoords.lat, primaryCoords.lon],
      [result.lat, result.lon]
    ], { color: 'blue' }).addTo(map);
    comparisonLayers.push(line);

    // Create list item
    const li = createListItem(result, distance, marker, line);

    // Insert list item in sorted order
    insertListItemSorted(li);

    // Adjust map view to include all markers
    adjustMapView();

    // Clear input and suggestions
    document.getElementById('comparison-input').value = '';
    document.getElementById('comparison-suggestions').innerHTML = '';
  } else if (!primaryCoords) {
    alert('Please set the primary location first.');
  }
});

// Function to update distances when primary location changes
function updateDistances() {
  const listItems = document.querySelectorAll('#comparison-list li');
  listItems.forEach((li, index) => {
    const distanceSpan = li.querySelector('span');
    const marker = comparisonMarkers[index];
    const coords = marker.getLatLng();
    const distance = calculateDistance(primaryCoords, { lat: coords.lat, lon: coords.lng });
    distanceSpan.textContent = `Distance: ${distance} km`;

    // Update data-distance attribute
    li.setAttribute('data-distance', distance);

    // Update line
    const line = comparisonLayers[index];
    line.setLatLngs([
      [primaryCoords.lat, primaryCoords.lon],
      [coords.lat, coords.lng]
    ]);
  });

  // Sort the list based on updated distances
  sortComparisonList();
  
  // Adjust map view to include all markers
  adjustMapView();
}

// Function to sort the comparison list based on data-distance
function sortComparisonList() {
  const list = document.getElementById('comparison-list');
  const items = Array.from(list.getElementsByTagName('li'));

  items.sort((a, b) => {
    return parseFloat(a.getAttribute('data-distance')) - parseFloat(b.getAttribute('data-distance'));
  });

  // Clear the list and re-append sorted items
  list.innerHTML = '';
  items.forEach(item => list.appendChild(item));
}

// Function to adjust the map view to include all markers
function adjustMapView() {
  if (primaryMarker && comparisonMarkers.length > 0) {
    const group = new L.featureGroup([primaryMarker, ...comparisonMarkers]);
    map.fitBounds(group.getBounds().pad(0.5));
  } else if (primaryMarker) {
    map.setView(primaryMarker.getLatLng(), 10);
  }
}

// Close suggestions when clicking outside
document.addEventListener('click', function(event) {
  const primarySuggestions = document.getElementById('primary-suggestions');
  const comparisonSuggestions = document.getElementById('comparison-suggestions');
  if (!document.getElementById('primary-location').contains(event.target)) {
    primarySuggestions.innerHTML = '';
  }
  if (!document.getElementById('comparison-input').contains(event.target)) {
    comparisonSuggestions.innerHTML = '';
  }
});

// Improve User Experience by allowing Enter key to trigger buttons
document.getElementById('primary-location').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('set-primary').click();
  }
});

document.getElementById('comparison-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    document.getElementById('add-comparison').click();
  }
});
