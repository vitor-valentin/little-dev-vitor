document.addEventListener("DOMContentLoaded", () => {
      const sidebarPromise = fetch('/components/sidebar.html')
      .then(res => res.text())
      .then(html => {
        document.getElementById('sidebar-container').innerHTML = html;
      });
    
      const headerPromise = fetch('/components/header.html')
      .then(res => res.text())
      .then(html => {
        document.getElementById('headerContent-container').innerHTML = html;
      });

      window.componentsLoaded = Promise.all([sidebarPromise, headerPromise])
  });