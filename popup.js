// DOM elements
const toggleCheckbox = document.getElementById('toggleEnabled');
const statusText = document.getElementById('statusText');
const activePrefixName = document.getElementById('activePrefixName');
const activePrefixUrl = document.getElementById('activePrefixUrl');
const tryNextPrefixBtn = document.getElementById('tryNextPrefix');
const openOptionsBtn = document.getElementById('openOptions');
const legalInfoLink = document.getElementById('legalInfo');

// Load current state when popup opens
chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
  if (response) {
    toggleCheckbox.checked = response.enabled !== undefined ? response.enabled : true;
    updateStatusText(response.enabled);
    
    if (response.redirectPrefixes && response.redirectPrefixes.length > 0) {
      const activePrefix = response.redirectPrefixes[response.activePrefixIndex || 0];
      updatePrefixDisplay(activePrefix);
    }
  }
});

// Listen for toggle changes
toggleCheckbox.addEventListener('change', () => {
  const enabled = toggleCheckbox.checked;
  
  chrome.storage.sync.set({ enabled: enabled }, () => {
    chrome.runtime.sendMessage({
      action: 'toggleEnabled',
      enabled: enabled
    });
    
    updateStatusText(enabled);
  });
});

// Try next prefix button
tryNextPrefixBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'tryNextPrefix' }, (response) => {
    if (response && response.success && response.prefix) {
      updatePrefixDisplay(response.prefix);
      
      // Visual feedback
      tryNextPrefixBtn.textContent = 'Switched!';
      setTimeout(() => {
        tryNextPrefixBtn.textContent = 'Try Next Prefix';
      }, 1000);
    }
  });
});

// Open options page button
openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Legal info link
legalInfoLink.addEventListener('click', (e) => {
  e.preventDefault();
  showLegalModal();
});

/**
 * Show legal information modal
 */
function showLegalModal() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  modal.innerHTML = `
    <div style="
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 300px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    ">
      <h3 style="margin: 0 0 15px 0; color: #333;">Legal Information</h3>
      <div style="font-size: 12px; line-height: 1.4; color: #666;">
        <p><strong>Educational Use Only:</strong> This extension is intended for educational and research purposes.</p>
        <p><strong>User Responsibility:</strong> You are responsible for ensuring compliance with copyright laws and institutional policies.</p>
        <p><strong>Legal Risks:</strong> Accessing copyrighted materials without authorization may violate applicable laws.</p>
        <p><strong>No Warranty:</strong> This software is provided "as is" without warranty.</p>
      </div>
      <button onclick="this.closest('div').parentElement.remove()" style="
        margin-top: 15px;
        padding: 8px 16px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        width: 100%;
      ">Close</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close on background click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Update the status text based on enabled state
 */
function updateStatusText(enabled) {
  statusText.textContent = enabled ? 'Extension Enabled' : 'Extension Disabled';
  statusText.style.color = enabled ? '#333' : '#999';
}

/**
 * Update the mirror display
 */
function updatePrefixDisplay(prefix) {
  if (prefix) {
    activePrefixName.textContent = prefix.name || 'Custom Prefix';
    activePrefixUrl.textContent = prefix.url;
  }
}