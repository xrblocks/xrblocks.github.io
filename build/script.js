const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

if (menuToggle && mainNav) {
  menuToggle.addEventListener('click', () => {
    const isExpanded = mainNav.classList.toggle('active');
    menuToggle.setAttribute('aria-expanded', isExpanded);

    // Changes icon to 'close' when open and 'menu' when closed
    const icon = menuToggle.querySelector('.material-icons-outlined');
    if (icon) {
      icon.textContent = isExpanded ? 'close' : 'menu';
    }
  });
}
