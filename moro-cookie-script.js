/* -------------------------
   Cookie Banner MORO
   ------------------------- */

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
    setCheckboxes(acceptedCategories);
    enableIframes(acceptedCategories);
  } else if (consent === 'false') {
    resetCheckboxes();
    showPlaceholders();
  } else {
    showPlaceholders();
    setVisualPrechecked();

    const cookieIcon = document.querySelector('#cookie-icon');
    if (cookieIcon) cookieIcon.click();
  }

  // 🔹 Buttons
  const acceptBtn = document.querySelector('#accept-btn');
  const declineBtn = document.querySelector('#decline-btn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      precheckedToChecked();
      const accepted = getAcceptedCategories();
      localStorage.setItem('cookiesAccepted', 'true');
      localStorage.setItem('acceptedCategories', JSON.stringify(accepted));
      enableIframes(accepted);

      // Button-Status prüfen nach Klick (für dynamische Änderungen)
      updateAcceptButtonState();
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      localStorage.setItem('cookiesAccepted', 'false');
      localStorage.setItem('acceptedCategories', '[]');
      resetCheckboxes();
      showPlaceholders();

      // Button-Status nach Ablehnen prüfen
      updateAcceptButtonState();
    });
  }

  // 🔹 Checkboxen überwachen
  ['funktional','targeting'].forEach(category => {
    const input = document.querySelector('.opt-in-wrapper.is-' + category + ' input[type="checkbox"]');
    if (input) input.addEventListener('change', updateAcceptButtonState);
  });

  // Initial prüfen
  updateAcceptButtonState();

  /* -------------------------
     Neue Funktion: Button aktivieren/deaktivieren + Wiggle
     ------------------------- */

function updateAcceptButtonState() {
  if (!acceptBtn) return;

  // technisch aktive Checkboxen
  const accepted = getAcceptedCategories();

  // optisch vorausgewählte Checkboxen, die noch nicht technisch angehakt sind
  const prechecked = Array.from(document.querySelectorAll('.w-checkbox-input.w--redirected-checked'))
    .map(el => {
      const input = el.closest('.opt-in-wrapper')?.querySelector('input[type="checkbox"]');
      return input?.checked ? null : input; // nur noch nicht technisch gecheckte
    })
    .filter(Boolean);

  // Gesamtanzahl aktiver Checkboxen (technisch oder optisch)
  const totalActiveCount = accepted.length + prechecked.length;

  // Klick abfangen, wenn keine aktiv
  acceptBtn.removeEventListener('click', interceptClick, true);
  acceptBtn.removeEventListener('touchstart', interceptClick, true);

  if (totalActiveCount === 0) {
    acceptBtn.addEventListener('click', interceptClick, true);
    acceptBtn.addEventListener('touchstart', interceptClick, true);
    acceptBtn.style.cursor = 'not-allowed';
  } else {
    acceptBtn.style.cursor = 'pointer';
  }
}


  // Klick abfangen und Wiggle auslösen
  function interceptClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation(); // blockiert Webflow-Interaktionen
    wiggleOnce(e.currentTarget);
  }

  // Wiggle-Funktion (glatt)
  function wiggleOnce(btn) {
    let i = 0;
    const angles = [0, -10, 10, -8, 8, -5, 5, 0];
    const interval = 30;

    const wiggleInterval = setInterval(() => {
      btn.style.transform = `rotate(${angles[i]}deg)`;
      i++;
      if (i >= angles.length) {
        clearInterval(wiggleInterval);
        btn.style.transform = 'none';
      }
    }, interval);
  }
}

/* -------------------------
   Helpers for Webflow checkboxes
   ------------------------- */

// 🔹 Optische Vorauswahl setzen
function setVisualPrechecked() {
  ['funktional','targeting'].forEach(category => {
    const wrapper = document.querySelector('.opt-in-wrapper.is-' + category);
    if (wrapper) {
      const visual = wrapper.querySelector('.w-checkbox-input');
      if (visual) visual.classList.add('w--redirected-checked');
      const input = wrapper.querySelector('input[type="checkbox"]');
      if (input) input.checked = false;
    }
  });
}

// 🔹 Vor dem Akzeptieren: alle optisch markierten Checkboxen technisch aktivieren
function precheckedToChecked() {
  ['funktional','targeting'].forEach(category => {
    const wrapper = document.querySelector('.opt-in-wrapper.is-' + category);
    if (wrapper) {
      const visual = wrapper.querySelector('.w-checkbox-input');
      const input = wrapper.querySelector('input[type="checkbox"]');
      if (visual && visual.classList.contains('w--redirected-checked') && input) {
        input.checked = true;
      }
    }
  });
}

// Liest den Status der Checkboxen
function getAcceptedCategories() {
  const categories = [];
  ['funktional','targeting'].forEach(category => {
    const input = document.querySelector('.opt-in-wrapper.is-' + category + ' input[type="checkbox"]');
    if (input?.checked) categories.push(category);
  });
  return categories;
}

// Setzt Checkboxen und sichtbare UI
function setCheckboxes(categories) {
  ['funktional','targeting'].forEach(category => {
    const wrapper = document.querySelector('.opt-in-wrapper.is-' + category);
    const input = wrapper?.querySelector('input[type="checkbox"]');
    const visual = wrapper?.querySelector('.w-checkbox-input');
    if (!wrapper || !input || !visual) return;

    const checked = categories.includes(category);
    input.checked = checked;
    if (checked) visual.classList.add('w--redirected-checked');
    else visual.classList.remove('w--redirected-checked');
  });
}

// Entfernt Haken
function resetCheckboxes() {
  ['funktional','targeting'].forEach(category => {
    const wrapper = document.querySelector('.opt-in-wrapper.is-' + category);
    if (!wrapper) return;
    const input = wrapper.querySelector('input[type="checkbox"]');
    const visual = wrapper.querySelector('.w-checkbox-input');
    if (input) input.checked = false;
    if (visual) visual.classList.remove('w--redirected-checked');
  });
}

/* -------------------------
   Placeholder / iframe logic
   ------------------------- */

function createPlaceholder(el, src, width, height, altImg, category) {
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  if (el.id) placeholder.id = el.id;
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

function enableIframes(acceptedCategories = []) {
  document.querySelectorAll('.iframe-placeholder').forEach(function(div) {
    const category = div.getAttribute('data-cookiecategory');
    if (!category || acceptedCategories.includes(category)) {
      const iframe = document.createElement('iframe');
      if (div.id) iframe.id = div.id;
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
