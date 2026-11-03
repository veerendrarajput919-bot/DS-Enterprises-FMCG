
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let reg of regs) reg.unregister();
      });
    }

    (function () {
      const loggedIn = sessionStorage.getItem('ds_auth_logged_in') === 'true' || localStorage.getItem('ds_auth_logged_in') === 'true';
      if (!loggedIn) {
        window.location.replace('login.html');
      }
    })();
  