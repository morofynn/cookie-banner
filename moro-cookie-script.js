/* -------------------------
   Cookie Banner MORO
   v2.5.8 (Consent revocation + deferred iframe loading)
   ------------------------- */

const moroFrameTemplates = new WeakMap();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCookieIframes);
} else {
  initCookieIframes();
}

function initCookieIframes() {
  
  // 🔍 START UNIVERSAL-DIAGNOSE (Scannt GTM & iFrames)
  runMoroDiagnostics();

  // Keep the current choice in memory, even when browser storage is unavailable.
  let consent = null;
  let acceptedCategories = [];
  try {
    consent = localStorage.getItem('cookiesAccepted');
    const stored = JSON.parse(localStorage.getItem('acceptedCategories') || '[]');
    if (consent === 'true' && Array.isArray(stored)) {
      acceptedCategories = stored.filter(category => ['funktional', 'targeting'].includes(category));
    }
  } catch (error) {
    consent = null;
  }

  function saveConsent(categories) {
    acceptedCategories = categories;
    try {
      localStorage.setItem('cookiesAccepted', categories.length ? 'true' : 'false');
      localStorage.setItem('acceptedCategories', JSON.stringify(categories));
      localStorage.setItem('cookieConsentTime', Date.now().toString());
    } catch (error) {
      // Consent still applies for this page when storage is blocked.
    }
    updateGTMConsent(categories);
    syncIframes(categories);
    updateAcceptButtonState();
    toggleScrollBlock(false);
  }

  setCheckboxes(acceptedCategories);
  syncIframes(acceptedCategories);
  updateGTMConsent(acceptedCategories);
  if (consent !== 'true' && consent !== 'false') {
    resetCheckboxes();
    toggleScrollBlock(true);
    const cookieIcon = document.querySelector('#cookie-icon');
    if (cookieIcon) cookieIcon.click();
  }

  const acceptBtn = document.querySelector('#accept-btn');
  const declineBtn = document.querySelector('#decline-btn');

  if (acceptBtn) {
    acceptBtn.addEventListener('click', function() {
      saveConsent(getAcceptedCategories());
    });
  }

  if (declineBtn) {
    declineBtn.addEventListener('click', function() {
      resetCheckboxes();
      saveConsent([]);
    });
  }

  ['funktional','targeting'].forEach(category => {
    const input = document.querySelector('.opt-in-wrapper.is-' + category + ' input[type="checkbox"]');
    if (input) input.addEventListener('change', updateAcceptButtonState);
  });

  updateAcceptButtonState();

  function updateGTMConsent(categories) {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    const hasTargeting = categories.includes('targeting');
    const hasFunktional = categories.includes('funktional');

    gtag('consent', 'update', {
      'analytics_storage': hasTargeting ? 'granted' : 'denied',
      'ad_storage': hasTargeting ? 'granted' : 'denied',
      'ad_user_data': hasTargeting ? 'granted' : 'denied',
      'ad_personalization': hasTargeting ? 'granted' : 'denied',
      'functionality_storage': hasFunktional ? 'granted' : 'denied',
      'personalization_storage': hasFunktional ? 'granted' : 'denied'
    });

    window.dataLayer.push({
      'event': 'cookie_consent_updated',
      'consent_funktional': hasFunktional ? 'granted' : 'denied',
      'consent_targeting': hasTargeting ? 'granted' : 'denied'
    });
  }

  const observer = new MutationObserver((mutations) => {
    // Observe only frame changes, not our own placeholder content.
    const framesChanged = mutations.some(mutation =>
      mutation.type === 'attributes' ||
      Array.from(mutation.addedNodes).some(node =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.tagName === 'IFRAME' || node.querySelector('iframe'))
      )
    );
    if (framesChanged) syncIframes(acceptedCategories);
  });
  observer.observe(document.body, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['src', 'data-src', 'cookiecategory', 'data-cookiecategory']
  });

  /* -------------------------
     🚨 DIAGNOSE & WARN-POPUP LOGIK
     ------------------------- */
  function runMoroDiagnostics() {
    let errors = [];

    const gtmScript = document.querySelector('script[src*="googletagmanager.com/gtm.js"]');
    if (gtmScript) {
      const scripts = Array.from(document.querySelectorAll('script'));
      let gtmIndex = -1;
      let headCodeIndex = -1;

      scripts.forEach((scr, index) => {
        if (scr.src && scr.src.includes('googletagmanager.com/gtm.js')) gtmIndex = index;
        if (scr.textContent && scr.textContent.includes('moroHeaderCodeLoaded')) headCodeIndex = index;
      });

      if (!window.moroHeaderCodeLoaded) {
        errors.push({
          type: 'GTM-CODE FEHLT',
          message: 'Der Google Tag Manager ist aktiv, aber der MORO Consent Head-Code fehlt im Webflow-Head!'
        });
      } else if (gtmIndex !== -1 && headCodeIndex !== -1 && gtmIndex < headCodeIndex) {
        errors.push({
          type: 'REIHENFOLGE FALSCH',
          message: 'Der MORO Head-Code muss zwingend VOR (oberhalb) dem Google Tag Manager Skript platziert werden!'
        });
      }
    }

    const unsafeIframes = [];
    document.querySelectorAll('iframe').forEach(iframe => {
      const category = iframe.getAttribute('cookiecategory') || iframe.getAttribute('data-cookiecategory');
      const src = getMoroFrameSource(iframe) || iframe.getAttribute('id') || 'Unbekannte Quelle';
      
      if (!category && src && !src.startsWith('about:') && !src.startsWith('javascript:')) {
        unsafeIframes.push(src);
      }
    });

    if (unsafeIframes.length > 0) {
      errors.push({
        type: 'UNGESCHÜTZTE IFRAMES',
        message: `Es wurden ${unsafeIframes.length} iFrame(s) ohne zugewiesene Cookie-Kategorie gefunden. Diese wurden aus Sicherheitsgründen hart blockiert!`,
        sources: unsafeIframes
      });
    }

    if (errors.length > 0) {
      buildWarningPopup(errors);
    }
  }

  function buildWarningPopup(errors) {
    if (document.getElementById('moro-diagnostics-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'moro-diagnostics-popup';
    popup.style.cssText = `
      position: fixed; top: 15px; left: 50%; transform: translateX(-50%);
      width: 95%; max-width: 700px; max-height: 85vh; overflow-y: auto;
      background: #fff5f5; border: 3px solid #d93838; border-radius: 10px;
      padding: 25px; z-index: 999999; box-shadow: 0 15px 40px rgba(0,0,0,0.2);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #2b2b2b; line-height: 1.5; box-sizing: border-box;
    `;

    let popupContent = `
      <h2 style="margin-top:0; color:#d93838; font-size:20px; border-bottom:2px solid #fbcbcb; padding-bottom:10px; display:flex; align-items:center; gap:8px;">
        🛑 MORO Cookie Banner — Diagnose-Warnung
      </h2>
      <p style="font-size:13px; color:#555; margin-bottom:20px;">Diese Meldung ist nur im Entwicklungsmodus / für Admins sichtbar, da Fehler im Setup gefunden wurden.</p>
    `;

    errors.forEach(err => {
      popupContent += `
        <div style="background:#ffffff; border-left:5px solid #d93838; padding:15px; margin-bottom:20px; border-radius:4px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <strong style="background:#d93838; color:#fff; padding:2px 6px; font-size:11px; border-radius:3px; text-transform: uppercase;">${err.type}</strong>
          <p style="margin:8px 0; font-weight:bold; font-size:14px; color:#c62828;">${err.message}</p>
      `;

      if (err.type.includes('GTM')) {
        const gtmCodeSnippet = `<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.moroHeaderCodeLoaded = true;
  const priorConsent = localStorage.getItem('cookiesAccepted');
  const priorCategories = JSON.parse(localStorage.getItem('acceptedCategories') || '[]');
  const hasTargeting = priorCategories.includes('targeting');
  const hasFunktional = priorCategories.includes('funktional');
  gtag('consent', 'default', {
    'analytics_storage': (priorConsent === 'true' && hasTargeting) ? 'granted' : 'denied',
    'ad_storage': (priorConsent === 'true' && hasTargeting) ? 'granted' : 'denied',
    'ad_user_data': (priorConsent === 'true' && hasTargeting) ? 'granted' : 'denied',
    'ad_personalization': (priorConsent === 'true' && hasTargeting) ? 'granted' : 'denied',
    'functionality_storage': (priorConsent === 'true' && hasFunktional) ? 'granted' : 'denied',
    'personalization_storage': (priorConsent === 'true' && hasFunktional) ? 'granted' : 'denied',
    'wait_for_update': 500
  });
</script>`;
        popupContent += `
          <p style="font-size:12px; margin:5px 0; color:#555;">Kopiere den Code und füge ihn im Webflow-Projekt ganz oben in den <strong>Head Code</strong> ein:</p>
          <textarea readonly style="width:100%; height:110px; font-family:monospace; font-size:11px; padding:6px; border:1px solid #ddd; background:#fafafa; border-radius:4px; box-sizing:border-box; resize:none;">${gtmCodeSnippet}</textarea>
          <div style="margin-top:8px;"><button class="moro-copy-btn" data-code="${btoa(gtmCodeSnippet)}" style="background:#d93838; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">Code in Zwischenablage kopieren</button> <span class="moro-copy-status" style="font-size:12px; color:green; font-weight:bold; margin-left:10px;"></span></div>
        `;
      }

      if (err.type === 'UNGESCHÜTZTE IFRAMES') {
        popupContent += `
          <p style="font-size:12px; font-weight:bold; margin-bottom:5px; color:#444;">Betroffene iFrame-Quellen auf dieser Seite:</p>
          <ul style="margin:0 0 15px 0; padding-left:20px; font-size:12px; font-family:monospace; color:#333; word-break:break-all;">
            ${err.sources.map(src => `<li style="margin-bottom:4px;">${src}</li>`).join('')}
          </ul>
          
          <div style="background:#f9f9f9; border:1px solid #e2e2e2; padding:12px; border-radius:4px; font-size:12.5px;">
            <strong style="color:#333;">💡 Kurzanleitung zur Behebung in Webflow:</strong>
            <ol style="margin:6px 0 0 0; padding-left:20px; color:#555;">
              <li>Öffne das Projekt im <strong>Webflow Designer</strong>.</li>
              <li>Wähle das betroffene iFrame-Element (oder den Embed-Block) aus.</li>
              <li>Gehe rechts in die <strong>Element Settings</strong> (Zahnrad-Symbol, Taste D).</li>
              <li>Scrolle ganz nach unten zu <strong>Custom Attributes</strong>.</li>
              <li>Klicke auf das <strong>+ Symbol</strong> und füge folgendes Attribut hinzu:
                <br>• Name: <code style="background:#eee; padding:1px 4px; border-radius:3px; font-family:monospace; font-weight:bold; color:#000;">cookiecategory</code>
                <br>• Wert: <code style="background:#eee; padding:1px 4px; border-radius:3px; font-family:monospace; font-weight:bold; color:#000;">targeting</code> <em>(für Analytics/Maps/Marketing)</em> ODER <code style="background:#eee; padding:1px 4px; border-radius:3px; font-family:monospace; font-weight:bold; color:#000;">funktional</code>
              </li>
              <li>Seite neu <strong>veröffentlichen (publishen)</strong>. Fertig!</li>
            </ol>
          </div>
        `;
      }

      popupContent += `</div>`;
    });

    popupContent += `
      <div style="margin-top:20px; text-align:right;">
        <button id="moro-close-diag" style="background:transparent; border:none; text-decoration:underline; color:#666; cursor:pointer; font-size:13px;">Warnung temporär ausblenden & Schließen</button>
      </div>
    `;

    popup.innerHTML = popupContent;
    document.body.appendChild(popup);

    popup.querySelectorAll('.moro-copy-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const rawCode = atob(this.getAttribute('data-code'));
        navigator.clipboard.writeText(rawCode).then(() => {
          const status = this.nextElementSibling;
          status.innerText = '✓ Kopiert!';
          setTimeout(() => { status.innerText = ''; }, 3000);
        });
      });
    });

    document.getElementById('moro-close-diag').addEventListener('click', function() {
      popup.remove();
    });
  }

  /* -------------------------
     UI- & Helfer-Logik
     ------------------------- */
  function updateAcceptButtonState() {
    // Saving an empty selection is a valid withdrawal, just like "Decline".
    if (acceptBtn) acceptBtn.style.cursor = 'pointer';
  }
}

function setVisualPrechecked() {
  ['funktional','targeting'].forEach(category => {
    const wrapper = document.querySelector('.opt-in-wrapper.is-' + category);
    if (wrapper) {
      const visual = wrapper.querySelector('.w-checkbox-input');
      if (visual) visual.classList.add('w--redirected-checked');
      const input = wrapper.querySelector('input[type="checkbox"]');
      if (input) input.checked = true;
    }
  });
}

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

function getAcceptedCategories() {
  const categories = [];
  ['funktional','targeting'].forEach(category => {
    const input = document.querySelector('.opt-in-wrapper.is-' + category + ' input[type="checkbox"]');
    if (input?.checked) categories.push(category);
  });
  return categories;
}

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

function getCategoryLabelText(category) {
  const wrapper = document.querySelector('.opt-in-wrapper.is-' + category);
  if (wrapper) {
    const labelEl = wrapper.querySelector('.opt-in-label, .w-form-label');
    if (labelEl && labelEl.innerText && labelEl.innerText.trim() !== '') {
      return labelEl.innerText.trim();
    }
  }
  if (category === 'targeting') return 'Marketing / Targeting';
  if (category === 'funktional') return 'Funktionale Cookies';
  return category;
}

// 🎯 NEU: Scroll-Block Hilfsfunktion
function toggleScrollBlock(shouldBlock) {
  const cookieBanner = document.querySelector('.cookies');
  if (!cookieBanner || cookieBanner.getAttribute('block-scroll') !== 'true') return;

  if (shouldBlock) {
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    document.body.style.setProperty('overflow', 'hidden', 'important');
  } else {
    document.documentElement.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow');
  }
}

/* -------------------------
   Platzhalter-Erzeugung (v2.5.5-based mit Deep-Glow Rahmen)
   ------------------------- */
function createPlaceholder(el, src, width, height, altImg, category) {
  if (el.classList && el.classList.contains('iframe-placeholder')) return;
  
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  if (el.id) placeholder.id = el.id;
  moroFrameTemplates.set(placeholder, el.cloneNode(false));
  
  const origStyle = el.getAttribute('data-orig-style') || el.getAttribute('style') || '';
  const origClass = el.getAttribute('data-orig-class') || el.className || '';
  
  placeholder.setAttribute('data-src', src);
  placeholder.setAttribute('data-width', width);
  placeholder.setAttribute('data-height', height);
  placeholder.setAttribute('data-orig-style', origStyle);
  placeholder.setAttribute('data-orig-class', origClass);
  if (altImg) placeholder.setAttribute('data-alt-img', altImg);
  placeholder.setAttribute('data-cookiecategory', category);

  let demoText = 'Bitte stimmen Sie der Verwendung von Cookies zu, um den Inhalt zu laden.';

  // 1. 🎯 ANALYSE DER SEITEN-HELLIGKEIT (Sucht die reale Hintergrundfarbe des Eltern-Elements)
  let parentBg = 'rgba(255, 255, 255, 1)'; // Fallback weiß
  let parent = el.parentNode;
  while (parent) {
    const computedBg = window.getComputedStyle(parent).backgroundColor;
    if (computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'rgba(0,0,0,0)') {
      parentBg = computedBg;
      break;
    }
    parent = parent.parentElement;
  }

  // Luminanz-Berechnung, um zu wissen, ob die Website hell oder dunkel gemoddet ist
  let isDarkPage = false;
  const rgbValues = parentBg.match(/\d+/g);
  if (rgbValues && rgbValues.length >= 3) {
    const r = parseInt(rgbValues[0], 10);
    const g = parseInt(rgbValues[1], 10);
    const b = parseInt(rgbValues[2], 10);
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    if (luminance <= 130) isDarkPage = true; // Seite ist dunkel
  }

  // 2. 🎯 VISUELLE MAßSCHNEIDEREI JE NACH FOREN-THEME
  placeholder.style.cssText = origStyle; // Übernimmt border-radius des Original-iFrames
  placeholder.style.width = width;
  placeholder.style.height = height;
  placeholder.style.display = 'flex';
  placeholder.style.justifyContent = 'center';
  placeholder.style.alignItems = 'center';
  placeholder.style.boxSizing = 'border-box';

  let textColor = '#2b2b2b'; // Standard light theme text
  if (isDarkPage) {
    // 💎 DEEP-GLOW DARK (Optimiert für Kinderoptik Dunkel)
    placeholder.style.backgroundColor = 'rgba(20, 20, 20, 0.8)';
    placeholder.style.border = '1px solid rgba(255, 255, 255, 0.08)';
    placeholder.style.boxShadow = 'inset 0 0 20px rgba(255, 255, 255, 0.03)';
    textColor = '#ffffff'; 
  } else {
    // 💎 DEEP-GLOW LIGHT (Optimiert für helle Sektionen)
    placeholder.style.backgroundColor = 'rgba(245, 245, 245, 0.9)';
    placeholder.style.border = '1px solid rgba(0, 0, 0, 0.06)';
    placeholder.style.boxShadow = 'inset 0 0 20px rgba(0, 0, 0, 0.02)';
    textColor = '#2b2b2b';
  }

  let categoryNotice = '';
  if (category === 'nicht-definiert') {
    categoryNotice = `<br><span style="font-size: 0.85em; font-weight: bold; color: ${isDarkPage ? '#ff6b6b' : '#d93838'};">⚠️ Setup-Fehler: Diesem iFrame wurde in Webflow kein "cookiecategory"-Attribut zugewiesen!</span>`;
  } else {
    const displayLabel = getCategoryLabelText(category);
    categoryNotice = `<br><span style="font-size: 0.85em; font-weight: bold; opacity: 0.75;">(Erfordert Kategorie: ${displayLabel})</span>`;
  }

  // 3. 🎯 FLEX-WRAPPER FÜR ABSOLUTE, MULTILINE TEXT-ZENTRIERUNG
  const textWrapper = document.createElement('div');
  textWrapper.style.cssText = `
    width: 100%;
    padding: 1.5rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    font-family: sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: ${textColor};
  `;

  if (altImg) {
    const img = document.createElement('img');
    img.src = altImg; img.alt = demoText;
    img.style.cssText = `width:100%; height:100%; object-fit:cover;`;
    placeholder.appendChild(img);
  } else {
    textWrapper.innerHTML = `<div>${demoText}</div>${categoryNotice}`;
    placeholder.appendChild(textWrapper);
  }
  
  if (el.parentNode) el.parentNode.replaceChild(placeholder, el);
}

// Preserve sandbox, allow, title and other attributes across consent changes.
function getMoroFrameSource(iframe) {
  return iframe.getAttribute('data-src') || iframe.getAttribute('src') || '';
}

function blockMoroIframe(iframe) {
  const src = getMoroFrameSource(iframe);
  if (!src || /^(about:|javascript:)/i.test(src.trim())) return;
  const dimension = value => {
    if (!value || value === 'auto') return '100%';
    return /^\d+$/.test(value) ? value + 'px' : value;
  };
  const category = iframe.getAttribute('cookiecategory') ||
    iframe.getAttribute('data-cookiecategory') || 'nicht-definiert';
  createPlaceholder(
    iframe, src,
    dimension(iframe.getAttribute('width') || iframe.style.width),
    dimension(iframe.getAttribute('height') || iframe.style.height),
    iframe.getAttribute('alt-img') || iframe.getAttribute('data-alt-img'),
    category
  );
}

function enableIframes(acceptedCategories = []) {
  document.querySelectorAll('.iframe-placeholder').forEach(div => {
    const category = div.getAttribute('data-cookiecategory');
    if (!['funktional', 'targeting'].includes(category) || !acceptedCategories.includes(category)) return;
    const src = div.getAttribute('data-src');
    if (!src) return;
    const template = moroFrameTemplates.get(div);
    const iframe = template ? template.cloneNode(false) : document.createElement('iframe');
    if (div.id) iframe.id = div.id;
    iframe.setAttribute('cookiecategory', category);
    iframe.setAttribute('data-src', src);
    if (!template) {
      iframe.setAttribute('width', div.getAttribute('data-width') || '100%');
      iframe.setAttribute('height', div.getAttribute('data-height') || '100%');
      iframe.setAttribute('style', div.getAttribute('data-orig-style') || 'border:0');
      iframe.className = div.getAttribute('data-orig-class') || '';
    }
    iframe.setAttribute('src', src);
    if (div.parentNode) div.parentNode.replaceChild(iframe, div);
  });
}

function syncIframes(acceptedCategories = []) {
  document.querySelectorAll('iframe[src], iframe[data-src]').forEach(iframe => {
    const src = getMoroFrameSource(iframe);
    if (!src || /^(about:|javascript:)/i.test(src.trim())) return;
    const category = iframe.getAttribute('cookiecategory') || iframe.getAttribute('data-cookiecategory');
    const allowed = ['funktional', 'targeting'].includes(category) && acceptedCategories.includes(category);
    if (!allowed) {
      blockMoroIframe(iframe);
    } else if (iframe.getAttribute('src') !== src) {
      // data-src is inert until the corresponding category has been accepted.
      iframe.setAttribute('src', src);
    }
  });
  enableIframes(acceptedCategories);
}

function showPlaceholders() {
  syncIframes([]);
}
