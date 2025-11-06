<!-- Cookie-Consent + iFrame-Blocking -->

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookieIframes);
} else {
  initCookieIframes();
}

function initCookieIframes() {
  // 🔹 Replace iframes with placeholders
  document.querySelectorAll('iframe[src]').forEach(function(iframe) {
    const src = iframe.src;
    const width = iframe.getAttribute('width') || iframe.style.width || '100%';
    const height = iframe.getAttribute('height') || iframe.style.height || '100%';
    const altImg = iframe.getAttribute('alt-img');
    const category = iframe.getAttribute('cookiecategory');

    iframe.setAttribute('data-src', src);
    iframe.setAttribute('data-width', width);
    iframe.setAttribute('data-height', height);
    if (altImg) iframe.setAttribute('data-alt-img', altImg);
    if (category) iframe.setAttribute('data-cookiecategory', category);

    iframe.removeAttribute('src');
    createPlaceholder(iframe, src, width, height, altImg, category);
  });

  // 🔹 Load previous consent state
  const consent = localStorage.getItem('cookiesAccepted');
  const acceptedCategories = JSON.parse(localStorage.getItem('acceptedCategories') || '[]');

  if (consent === 'true') {
    // Set UI & inputs, then load iframes
    setCheckboxes(acceptedCategories);
    enableIframes(acceptedCategories);
  } else if (consent === 'false') {
    // Ensure UI unchecked and placeholders shown
    resetCheckboxes();
    showPlaceholders();
  } else {
    // first time: show placeholders and optionally open banner
    showPlaceholders();
    const cookieIcon = document.querySelector('#cookie-icon');
    if (cookieIcon) cookieIcon.click();
  }

  // 🔹 Buttons
  const acceptBtn = document.querySelector('#accept-btn');
  const declineBtn = document.querySelector('#decline-btn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      const accepted = getAcceptedCategories();
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('acceptedCategories', JSON.stringify(accepted));
      enableIframes(accepted);
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      localStorage.setItem('cookiesAccepted', 'false');
      localStorage.setItem('acceptedCategories', '[]');
      resetCheckboxes();
      showPlaceholders();
    });
  }
}

/* -------------------------
   Helpers for Webflow checkboxes
   ------------------------- */

// Liest den Status der (unsichtbaren) input[type=checkbox] in den Webflow-Wrappers
function getAcceptedCategories() {
  const categories = [];

  const funktionalInput = queryWrapperInput('is-funktional');
  if (funktionalInput?.checked) categories.push('funktional');

  const targetingInput = queryWrapperInput('is-targeting');
  if (targetingInput?.checked) categories.push('targeting');

  return categories;
}

// Setzt Checkboxen (input.checked) und passt die sichtbare DIV-UI an
function setCheckboxes(categories) {
  setWrapperCheckbox('is-funktional', categories.includes('funktional'));
  setWrapperCheckbox('is-targeting', categories.includes('targeting'));
}

// Entfernt Haken in allen opt-in-wrappers (sichtbar + input)
function resetCheckboxes() {
  document.querySelectorAll('.opt-in-wrapper').forEach(wrapper => {
    const input = wrapper.querySelector('input[type="checkbox"]');
    if (input) input.checked = false;

    // sichtbares DIV innerhalb des wrappers (Webflow default structure)
    const visual = wrapper.querySelector('.w-checkbox-input');
    if (visual) {
      visual.classList.remove('w--redirected-checked');
    }

    // defensive cleanup
    wrapper.classList.remove('w--redirected-checked');
  });
}

// Utility: finde das input[type=checkbox] innerhalb eines wrappers mit Klasse is-...
function queryWrapperInput(isClass) {
  return document.querySelector('.opt-in-wrapper.' + isClass + ' input[type="checkbox"]');
}

// Utility: setze einen wrapper (isClass) auf checked = bool und toggles sichtbare UI
function setWrapperCheckbox(isClass, boolChecked) {
  const wrapper = document.querySelector('.opt-in-wrapper.' + isClass);
  if (!wrapper) return;

  const input = wrapper.querySelector('input[type="checkbox"]');
  const visual = wrapper.querySelector('.w-checkbox-input');

  if (input) {
    input.checked = !!boolChecked;
    // trigger change event, falls Webflow darauf reagiert
    const ev = new Event('change', { bubbles: true });
    input.dispatchEvent(ev);
  }

  // sichtbares Element updaten
  if (visual) {
    if (boolChecked) {
      visual.classList.add('w--redirected-checked');
    } else {
      visual.classList.remove('w--redirected-checked');
    }
  }

  // optional: wrapper ebenfalls aktualisieren
  if (boolChecked) {
    wrapper.classList.add('w--redirected-checked');
  } else {
    wrapper.classList.remove('w--redirected-checked');
  }
}

/* -------------------------
   Placeholder / iframe logic
   ------------------------- */

// Create placeholder
function createPlaceholder(el, src, width, height, altImg, category) {
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  placeholder.setAttribute('data-src', src);
  placeholder.setAttribute('data-width', width);
  placeholder.setAttribute('data-height', height);
  if (altImg) placeholder.setAttribute('data-alt-img', altImg);
  if (category) placeholder.setAttribute('data-cookiecategory', category);

  const demoEl = document.querySelector('.iframe-placeholder-demo');
  let computedStyles = {};
  let demoText = 'Bitte stimmen Sie der Verwendung von Cookies zu, um den Inhalt zu laden.';
  if (demoEl) {
    const styles = window.getComputedStyle(demoEl);
    computedStyles = {
      textAlign: styles.textAlign,
      backgroundColor: styles.backgroundColor,
      fontFamily: styles.fontFamily,
      color: styles.color,
      fontSize: styles.fontSize,
      lineHeight: styles.lineHeight,
      fontWeight: styles.fontWeight,
    };
    demoText = demoEl.innerText || demoText;
  }

  placeholder.style.cssText = `
    z-index: auto;
    display:flex;
    justify-content:center;
    align-items:center;
    padding: ${altImg ? '0' : '1rem'};
    width:${width};
    height:${height};
    overflow:hidden;
    position:relative;
    text-align: ${computedStyles.textAlign || 'center'};
    background-color: ${computedStyles.backgroundColor || '#f6f6f6'};
    font-family: ${computedStyles.fontFamily || 'sans-serif'};
    color: ${computedStyles.color || '#333'};
    font-size: ${computedStyles.fontSize || '1rem'};
    line-height: ${computedStyles.lineHeight || '1.2'};
    font-weight: ${computedStyles.fontWeight || '400'};
  `;

  if (altImg) {
    const img = document.createElement('img');
    img.src = altImg;
    img.alt = demoText;
    img.style.cssText = `width:100%; height:100%; object-fit:cover;`;
    placeholder.appendChild(img);
  } else {
    placeholder.innerText = demoText;
  }

  el.parentNode.replaceChild(placeholder, el);
}

// Enable iframes for accepted categories
function enableIframes(acceptedCategories = []) {
  document.querySelectorAll('.iframe-placeholder').forEach(function(div) {
    const category = div.getAttribute('data-cookiecategory');
    if (!category || acceptedCategories.includes(category)) {
      const iframe = document.createElement('iframe');
      iframe.src = div.getAttribute('data-src');
      iframe.setAttribute('width', div.getAttribute('data-width'));
      iframe.setAttribute('height', div.getAttribute('data-height'));
      const altImg = div.getAttribute('data-alt-img');
      if (altImg) iframe.setAttribute('alt-img', altImg);
      if (category) iframe.setAttribute('cookiecategory', category);
      iframe.style.border = '0';
      div.parentNode.replaceChild(iframe, div);
    }
  });
}

// Show placeholders (convert back from iframe if needed)
function showPlaceholders() {
  document.querySelectorAll('iframe, .iframe-placeholder').forEach(function(el) {
    if (el.tagName === 'IFRAME') {
      const src = el.getAttribute('data-src') || el.src;
      const width = el.getAttribute('data-width') || el.width || '100%';
      const height = el.getAttribute('data-height') || el.height || '100%';
      const altImg = el.getAttribute('alt-img') || el.getAttribute('data-alt-img');
      const category = el.getAttribute('cookiecategory') || el.getAttribute('data-cookiecategory');
      createPlaceholder(el, src, width, height, altImg, category);
    } else if (el.tagName === 'DIV') {
      const altImg = el.getAttribute('data-alt-img');
      const width = el.getAttribute('data-width') || '100%';
      const height = el.getAttribute('data-height') || '100%';
      const src = el.getAttribute('data-src') || '';
      const category = el.getAttribute('data-cookiecategory');
      createPlaceholder(el, src, width, height, altImg, category);
    }
  });
}
