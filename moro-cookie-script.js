// 🔹 Create placeholder
function createPlaceholder(el, src, width, height, altImg) {
  const placeholder = document.createElement('div');
  placeholder.className = 'iframe-placeholder';
  placeholder.setAttribute('data-src', src);
  placeholder.setAttribute('data-width', width);
  placeholder.setAttribute('data-height', height);
  if (altImg) placeholder.setAttribute('data-alt-img', altImg);

  placeholder.style.cssText = `
    z-index: auto;
    display:flex;
    justify-content:center;
    align-items:center;
    padding: 1rem;
    width:${width};
    height:${height};
    background:#f6f6f6;
    color:#333;
    border:1px solid #e0e0e0;
    overflow:hidden;
    position:relative;
  `;

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
  } else {
    placeholder.innerText = 'Bitte stimmen Sie der Verwendung von Cookies zu, um den Inhalt zu laden.';
  }

  el.parentNode.replaceChild(placeholder, el);
}
