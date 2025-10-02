document.addEventListener("DOMContentLoaded", () => {
    fetch('/sidebar.html')
      .then(res => res.text())
      .then(html => {
        document.getElementById('sidebar-container').innerHTML = html;
      });
  });