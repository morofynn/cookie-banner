<!-- Cookie-Consent + iFrame-Blocking -->

  
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookieIframes);
} else {
  initCookieIframes();
}

function initCookieIframes() {
  // Replace iframes with placeholders
  document.querySelectorAll('iframe[src]').forEach(function(iframe) {
    const src = iframe.src;
    const width = iframe.getAttribute('width') || iframe.style.width || '100%';
    const height = iframe.getAttribute('height') || iframe.style.height || '100%';
    const altImg = iframe.getAttribute('alt-img');

    iframe.setAttribute('data-src', src);
    iframe.setAttribute('data-width', width);
    iframe.setAttribute('data-height', height);
    if (altImg) iframe.setAttribute('data-alt-img', altImg);

    iframe.removeAttribute('src');

    createPlaceholder(iframe, src, width, height, altImg);
  });

// Check existing consent
const consent = localStorage.getItem('cookiesAccepted');

if (consent === 'true') {
    enableIframes();
} else if (consent === 'false') {
    showPlaceholders();
} else {
    // No consent state yet
    showPlaceholders();
    
    // Simulate a click on the cookie icon
    const cookieIcon = document.querySelector('#cookie-icon'); // adjust selector
    if (cookieIcon) {
        cookieIcon.click();
    }
}


  // Buttons
  const acceptBtn = document.querySelector('#accept-btn');
  const declineBtn = document.querySelector('#decline-btn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      localStorage.setItem('cookiesAccepted', 'true');
      enableIframes();
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      localStorage.setItem('cookiesAccepted', 'false');
      showPlaceholders();
    });
  }
}

function createPlaceholder(el, src, width, height, altImg) {
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  placeholder.setAttribute('data-src', src);
  placeholder.setAttribute('data-width', width);
  placeholder.setAttribute('data-height', height);
  if (altImg) placeholder.setAttribute('data-alt-img', altImg);

  // Set basic layout styles
  placeholder.style.cssText = `
    z-index: auto;
    display:flex;
    justify-content:center;
    align-items:center;
    padding: 1rem;
    width:${width};
    height:${height};
    overflow:hidden;
    position:relative;
  `;

  // 🔹 Pull computed styles from .iframe-placeholder
  const temp = document.createElement('div');
  temp.className = 'iframe-placeholder';
  document.body.appendChild(temp);
  const cs = getComputedStyle(temp);

  placeholder.style.textAlign = cs.textAlign;
  placeholder.style.backgroundColor = cs.backgroundColor;
  placeholder.style.fontFamily = cs.fontFamily;
  placeholder.style.color = cs.color;
  placeholder.style.fontSize = cs.fontSize;
  placeholder.style.lineHeight = cs.lineHeight;
  placeholder.style.fontWeight = cs.fontWeight;

  // 🔹 Set innerText from an existing .iframe-placeholder on the page (if any)
  const referenceTextDiv = document.querySelector('.iframe-placeholder');
  if (referenceTextDiv && !altImg) {
    placeholder.innerText = referenceTextDiv.innerText;
  } else if (!altImg) {
    placeholder.innerText = 'Bitte stimmen Sie der Verwendung von Cookies zu, um den Inhalt zu laden.';
  }

  document.body.removeChild(temp);

  if (altImg) {
    const img = document.createElement('img');
    img.src = altImg;
    img.alt = 'Bitte stimmen Sie der Verwendung von Cookies zu, um den Inhalt zu laden.';
    img.style.cssText = `
      width:100%;
      height:100%;
      object-fit:cover;
    `;
    placeholder.appendChild(img);
  }

  el.parentNode.replaceChild(placeholder, el);
}

// 🔹 Enable iframes
function enableIframes() {
  document.querySelectorAll('.iframe-placeholder').forEach(function(div) {
    const iframe = document.createElement('iframe');
    iframe.src = div.getAttribute('data-src');
    iframe.setAttribute('width', div.getAttribute('data-width'));
    iframe.setAttribute('height', div.getAttribute('data-height'));
    const altImg = div.getAttribute('data-alt-img');
    if (altImg) iframe.setAttribute('alt-img', altImg);
    iframe.style.border = '0';
    div.parentNode.replaceChild(iframe, div);
  });
}

// 🔹 Show placeholders (convert back from iframe if needed)
function showPlaceholders() {
  document.querySelectorAll('iframe, .iframe-placeholder').forEach(function(el) {
    if (el.tagName === 'IFRAME') {
      // Iframe → Platzhalter
      const src = el.getAttribute('data-src') || el.src;
      const width = el.getAttribute('data-width') || el.width || '100%';
      const height = el.getAttribute('data-height') || el.height || '100%';
      const altImg = el.getAttribute('alt-img') || el.getAttribute('data-alt-img');

      createPlaceholder(el, src, width, height, altImg);
    } else if (el.tagName === 'DIV') {
      // Existierender Platzhalter → neu rendern
      const altImg = el.getAttribute('data-alt-img');
      const width = el.getAttribute('data-width') || '100%';
      const height = el.getAttribute('data-height') || '100%';
      const src = el.getAttribute('data-src') || '';

      createPlaceholder(el, src, width, height, altImg);
    }
  });
}


