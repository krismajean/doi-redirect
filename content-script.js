// Content script for hover tooltips on redirectable links
// This script runs on all web pages to detect links that will be redirected

(function() {
  'use strict';

  // Configuration
  const TOOLTIP_CONFIG = {
    enabled: true,
    delay: 500, // ms delay before showing tooltip
    fadeInDuration: 200,
    fadeOutDuration: 150,
    maxWidth: 300,
    zIndex: 10000
  };

  let tooltipElement = null;
  let hoverTimeout = null;
  let currentLink = null;

  // Check if extension is enabled and tooltips are enabled
  function checkExtensionStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ enabled: false, tooltipsEnabled: false });
          return;
        }
        
        resolve({
          enabled: response?.enabled !== false,
          tooltipsEnabled: response?.settings?.showHoverTooltips !== false,
          urlPatterns: response?.urlPatterns || [],
          activePrefix: response?.redirectPrefixes?.[response?.activePrefixIndex] || null
        });
      });
    });
  }

  // Check if a URL matches redirect patterns
  function matchesRedirectPattern(url, patterns) {
    if (!patterns || patterns.length === 0) return false;
    
    return patterns.some(pattern => {
      if (!pattern.active) return false;
      
      switch (pattern.type) {
        case 'hostContains':
          return url.includes(pattern.pattern);
        case 'startsWith':
          return url.startsWith(pattern.pattern);
        case 'exact':
          return url === pattern.pattern;
        case 'regex':
          try {
            return new RegExp(pattern.pattern).test(url);
          } catch (e) {
            return false;
          }
        default:
          return false;
      }
    });
  }

  // Clean DOI URL (same logic as background script)
  function cleanDOIUrl(originalUrl) {
    try {
      const decodedUrl = decodeURIComponent(originalUrl);
      
      if (decodedUrl.includes('doi.org/')) {
        const doiId = decodedUrl.split('doi.org/')[1];
        if (doiId) {
          const cleanDOIId = doiId.split('#')[0].split('?')[0].replace(/\/$/, '');
          return `https://doi.org/${cleanDOIId}`;
        }
      }
      
      return decodedUrl;
    } catch (error) {
      return originalUrl;
    }
  }

  // Create tooltip element
  function createTooltip() {
    if (tooltipElement) return tooltipElement;

    const tooltip = document.createElement('div');
    tooltip.id = 'doi-redirect-tooltip';
    tooltip.style.cssText = `
      position: absolute;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: ${TOOLTIP_CONFIG.zIndex};
      max-width: ${TOOLTIP_CONFIG.maxWidth}px;
      opacity: 0;
      transition: opacity ${TOOLTIP_CONFIG.fadeInDuration}ms ease-in-out;
      pointer-events: none;
      word-wrap: break-word;
      line-height: 1.4;
    `;

    // Add arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid #764ba2;
    `;
    tooltip.appendChild(arrow);

    document.body.appendChild(tooltip);
    tooltipElement = tooltip;
    return tooltip;
  }

  // Show tooltip
  function showTooltip(link, redirectInfo) {
    if (!tooltipElement) createTooltip();

    const rect = link.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;

    // Calculate position (above the link)
    const tooltipX = rect.left + scrollX + (rect.width / 2);
    const tooltipY = rect.top + scrollY - 10;

    // Set content
    const originalUrl = cleanDOIUrl(link.href);
    const redirectUrl = `${redirectInfo.activePrefix.url}${originalUrl}`;
    
    tooltipElement.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 600;">
        🔗 Academic Access Redirect
      </div>
      <div style="font-size: 11px; opacity: 0.9; margin-bottom: 6px;">
        <strong>Original:</strong> ${originalUrl.length > 50 ? originalUrl.substring(0, 50) + '...' : originalUrl}
      </div>
      <div style="font-size: 11px; opacity: 0.9; margin-bottom: 8px;">
        <strong>Via:</strong> ${redirectInfo.activePrefix.name}
      </div>
      <div style="font-size: 10px; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px;">
        Click to redirect • Right-click to disable
      </div>
    `;

    // Position tooltip
    tooltipElement.style.left = `${tooltipX - (tooltipElement.offsetWidth / 2)}px`;
    tooltipElement.style.top = `${tooltipY - tooltipElement.offsetHeight}px`;

    // Show with fade in
    tooltipElement.style.opacity = '1';
    currentLink = link;
  }

  // Hide tooltip
  function hideTooltip() {
    if (!tooltipElement) return;

    tooltipElement.style.opacity = '0';
    setTimeout(() => {
      if (tooltipElement && tooltipElement.style.opacity === '0') {
        tooltipElement.style.display = 'none';
      }
    }, TOOLTIP_CONFIG.fadeOutDuration);

    currentLink = null;
  }

  // Handle link hover
  function handleLinkHover(event) {
    const link = event.target.closest('a');
    if (!link || !link.href) return;

    // Clear existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }

    // Check if extension is enabled and link matches patterns
    checkExtensionStatus().then(status => {
      if (!status.enabled || !status.tooltipsEnabled) return;
      if (!matchesRedirectPattern(link.href, status.urlPatterns)) return;

      // Set timeout to show tooltip
      hoverTimeout = setTimeout(() => {
        showTooltip(link, status);
      }, TOOLTIP_CONFIG.delay);
    });
  }

  // Handle link leave
  function handleLinkLeave(event) {
    const link = event.target.closest('a');
    if (!link) return;

    // Clear timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }

    // Hide tooltip
    hideTooltip();
  }

  // Handle right-click to disable
  function handleLinkRightClick(event) {
    const link = event.target.closest('a');
    if (!link || !link.href) return;

    checkExtensionStatus().then(status => {
      if (!status.enabled || !matchesRedirectPattern(link.href, status.urlPatterns)) return;

      // Show context menu option
      event.preventDefault();
      
      // Create context menu
      const contextMenu = document.createElement('div');
      contextMenu.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        z-index: ${TOOLTIP_CONFIG.zIndex + 1};
        padding: 8px 0;
        min-width: 200px;
      `;

      const disableOption = document.createElement('div');
      disableOption.textContent = 'Disable Academic Access for this page';
      disableOption.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        font-size: 13px;
        color: #333;
      `;
      disableOption.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'toggleEnabled', enabled: false });
        contextMenu.remove();
      });

      contextMenu.appendChild(disableOption);
      document.body.appendChild(contextMenu);

      // Position context menu
      contextMenu.style.left = `${event.pageX}px`;
      contextMenu.style.top = `${event.pageY}px`;

      // Remove on click outside
      setTimeout(() => {
        document.addEventListener('click', () => contextMenu.remove(), { once: true });
      }, 100);
    });
  }

  // Initialize tooltip system
  function initTooltips() {
    // Add event listeners
    document.addEventListener('mouseover', handleLinkHover, true);
    document.addEventListener('mouseout', handleLinkLeave, true);
    document.addEventListener('contextmenu', handleLinkRightClick, true);

    // Handle dynamic content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Re-initialize for new content
            if (node.tagName === 'A' || node.querySelector('a')) {
              // Content already handled by event delegation
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('DOI Redirect hover tooltips initialized');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTooltips);
  } else {
    initTooltips();
  }

})();

