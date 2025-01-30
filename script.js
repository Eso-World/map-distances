/* ======= New Code for Copying Addresses with Modal ======= */

// Select all address buttons
const addressButtons = document.querySelectorAll('.address-button');
const copyFeedback = document.getElementById('copy-feedback');

// Modal Elements
const copyModal = document.getElementById('copy-modal');
const closeModal = document.getElementById('close-modal');

// Function to copy text to clipboard with fallback
function copyToClipboard(text, button) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    // Use navigator.clipboard API if available
    navigator.clipboard.writeText(text).then(() => {
      showCopyModal();
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
      showCopyModal();
      highlightButton(button);
    } else {
      console.error('Fallback: Oops, unable to copy');
    }
  } catch (err) {
    console.error('Fallback: Could not copy text', err);
  }
  
  document.body.removeChild(textArea);
}

// Function to show copy feedback using modal
function showCopyModal() {
  copyModal.classList.remove('hidden');
  copyModal.classList.add('visible');
  
  // Automatically close the modal after 2 seconds
  setTimeout(() => {
    copyModal.classList.remove('visible');
    copyModal.classList.add('hidden');
  }, 2000);
}

// Function to highlight the copied button
function highlightButton(button) {
  button.classList.add('copied');
  setTimeout(() => {
    button.classList.remove('copied');
  }, 1000); // Highlight for 1 second
}

// Event listener to close the modal when the close button is clicked
closeModal.addEventListener('click', () => {
  copyModal.classList.remove('visible');
  copyModal.classList.add('hidden');
});

// Close the modal when clicking outside the modal content
window.addEventListener('click', (event) => {
  if (event.target == copyModal) {
    copyModal.classList.remove('visible');
    copyModal.classList.add('hidden');
  }
});

// Add click event listeners to address buttons
addressButtons.forEach(button => {
  button.addEventListener('click', () => {
    const address = button.getAttribute('data-address');
    if (address) {
      copyToClipboard(address, button);
    }
  });
});
