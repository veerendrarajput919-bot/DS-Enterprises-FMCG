
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let reg of regs) reg.unregister();
      });
    }

    // Instant routing guard: redirect root index.html to dashboard or login
    (function () {
      const loggedIn = sessionStorage.getItem('ds_auth_logged_in') === 'true' || localStorage.getItem('ds_auth_logged_in') === 'true';
      if (loggedIn) {
        window.location.replace('pages/dashboard.html');
      } else {
        window.location.replace('pages/login.html');
      }
    })();
  