// Initialize the map
const map = L.map('map').setView([20, 0], 2); // World view

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Predefined addresses corresponding to each button (index 0-10)
const predefinedAddresses = [
  "Zur Luftbrücke 1, 31515 Wunstorf, Germany",
  "10, Sedanstraße, Weststadt, Ulm, Baden-Württemberg, 89077, Germany",
  "Claude-Dornier-Straße, 88090 Immenstaad am Bodensee, Germany",
  "Willy-Messerschmitt-Straße 1, 82024 Taufkirchen, Germany",
  "Gunnels Wood Rd, Stevenage SG1 2AS",
  "Av. Maestranza Aérea, 41011 Sevilla, Spain",
  "Anchorage Road, Portsmouth PO3 5PU",
  "Rechliner Str., 85077 Manching, Germany",
  "Quadrant House, Celtic Springs Business Park, Duffryn, Newport NP10 8FZ",
  "Partnership House, Regent Farm Rd, Newcastle upon Tyne NE3 3AF",
  "ZA Clef de Saint Pierre, 1 Bd Jean Moulin, 78990 Élancourt, France"
];

// Select all address buttons
const addressButtons = document.querySelectorAll('.address-button');
const copyFeedback = document.getElementById('copy-feedback');

// Function to copy text to clipboard with fallback
function copyToClipboard(text, button) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    // Use navigator.clipboard API if available
    navigator.clipboard.writeText(text).then(() => {
      showCopyFeedback();
      highlightButton(button);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      fallbackCopyTextToClipboard(text, button);
    });
  } else {
    // Fallback method
    fallbackCopyTextToClipboard(text, button);
  }
}

// Fallback method for copying text
function fallbackCopyTextToClipboard(text, button) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Avoid scrolling to bottom
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showCopyFeedback();
      highlightButton(button);
    } else {
      console.error('Fallback: Oops, unable to copy');
    }
  } catch (err) {
    console.error('Fallback: Could not copy text', err);
  }
  
  document.body.removeChild(textArea);
}

// Function to show copy feedback
function showCopyFeedback() {
  copyFeedback.classList.remove('hidden');
  copyFeedback.classList.add('visible');
  setTimeout(() => {
    copyFeedback.classList.remove('visible');
    copyFeedback.classList.add('hidden');
  }, 2000); // Feedback visible for 2 seconds
}

// Function to highlight the copied button
function highlightButton(button) {
  button.classList.add('copied');
  setTimeout(() => {
    button.classList.remove('copied');
  }, 1000); // Highlight for 1 second
}

// Add click event listeners to address buttons
addressButtons.forEach(button => {
  button.addEventListener('click', () => {
    const index = parseInt(button.getAttribute('data-index'), 10);
    const address = predefinedAddresses[index];
    if (address) {
      copyToClipboard(address, button);
    }
  });
});
