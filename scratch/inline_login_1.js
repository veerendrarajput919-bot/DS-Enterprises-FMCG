
    function switchLoginTab(tab) {
      const adminForm = document.getElementById('adminLoginForm');
      const soForm = document.getElementById('soLoginForm');
      const btnAdmin = document.getElementById('tabBtnAdmin');
      const btnSo = document.getElementById('tabBtnSo');
      const errBox = document.getElementById('loginErrorAlert');
      if (errBox) errBox.style.display = 'none';

      if (tab === 'admin') {
        adminForm.style.display = 'block';
        soForm.style.display = 'none';
        btnAdmin.className = 'btn btn-primary';
        btnSo.className = 'btn btn-secondary';
      } else {
        adminForm.style.display = 'none';
        soForm.style.display = 'block';
        btnAdmin.className = 'btn btn-secondary';
        btnSo.className = 'btn btn-primary';
      }
    }

    function togglePasswordVisibility(inputId) {
      const input = document.getElementById(inputId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    }

    function handleAdminLoginSubmit(e) {
      e.preventDefault();
      const user = document.getElementById('adminUsernameInput').value.trim();
      const pass = document.getElementById('adminPasswordInput').value.trim();
      const errBox = document.getElementById('loginErrorAlert');

      const result = DS_Auth.loginAdmin(user, pass);
      if (result.success) {
        window.location.href = 'dashboard.html';
      } else {
        if (errBox) {
          errBox.textContent = result.message || 'Invalid Admin Username or Password!';
          errBox.style.display = 'block';
        }
      }
    }

    function handleSoLoginSubmit(e) {
      e.preventDefault();
      const userId = document.getElementById('soUserIdInput').value.trim();
      const pass = document.getElementById('soPasswordInput').value.trim();
      const errBox = document.getElementById('loginErrorAlert');

      const result = DS_Auth.loginSo(userId, pass);
      if (result.success) {
        window.location.href = 'dashboard.html';
      } else {
        if (errBox) {
          errBox.textContent = result.message || 'Invalid User ID or Password! Please contact Admin.';
          errBox.style.display = 'block';
        }
      }
    }

    function openAdminRegisterModal() {
      const m = document.getElementById('adminRegisterModal');
      if (m) {
        m.style.display = 'flex';
        m.classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('regFullName')?.focus(), 150);
      }
    }

    function closeAdminRegisterModal() {
      const m = document.getElementById('adminRegisterModal');
      if (m) {
        m.style.display = 'none';
        m.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    function handleAdminRegisterSubmit(e) {
      e.preventDefault();
      const name = document.getElementById('regFullName').value.trim();
      const userId = document.getElementById('regUserId').value.trim().toLowerCase();
      const password = document.getElementById('regPassword').value.trim();
      const role = document.getElementById('regRole').value;
      const phone = document.getElementById('regPhone').value.trim();
      const route = document.getElementById('regRoute').value.trim();
      const adminPin = document.getElementById('regAdminPin').value.trim();
      const errBox = document.getElementById('regErrorAlert');

      if (errBox) errBox.style.display = 'none';

      if (!name || !userId || !password || !phone) {
        if (errBox) {
          errBox.textContent = 'Please fill all required fields!';
          errBox.style.display = 'block';
        }
        return;
      }

      const res = window.DS_Auth.registerOfficer({
        name: name,
        userId: userId,
        password: password,
        role: role,
        phone: phone,
        route: route,
        adminPin: adminPin
      });

      if (res.success) {
        closeAdminRegisterModal();
        if (window.DS_App && DS_App.toast) {
          DS_App.toast(`✓ Staff Account "${name}" registered successfully! Please sign in.`, 'success', 4000);
        }
        // Switch to Staff tab and pre-fill userId
        switchLoginTab('so');
        const soInp = document.getElementById('soUserIdInput');
        const soPass = document.getElementById('soPasswordInput');
        if (soInp) soInp.value = userId;
        if (soPass) {
          soPass.value = password;
          soPass.focus();
        }
      } else {
        if (errBox) {
          errBox.textContent = res.message || 'Registration failed! Please verify Admin PIN.';
          errBox.style.display = 'block';
        }
      }
    }

    // Display session timeout, manual logout, or unauthorized notices
    function checkLogoutNotice() {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'register' || urlParams.get('register') === 'true') {
        openAdminRegisterModal();
      }
      const urlReason = urlParams.get('reason');
      const storageReason = sessionStorage.getItem('ds_logout_notice');
      const noticeBox = document.getElementById('loginNoticeAlert');
      if (!noticeBox) return;

      const reason = urlReason || storageReason;
      if (!reason) return;

      // Consume the session storage notice once displayed
      sessionStorage.removeItem('ds_logout_notice');

      if (reason === 'timeout') {
        noticeBox.style.display = 'block';
        noticeBox.style.background = '#fffbeb';
        noticeBox.style.border = '1px solid #fde68a';
        noticeBox.style.color = '#92400e';
        noticeBox.innerHTML = '<strong>Session Expired:</strong> You were automatically signed out due to 15 minutes of inactivity for security. Please sign in again to continue.';
      } else if (reason === 'manual') {
        noticeBox.style.display = 'block';
        noticeBox.style.background = '#f0fdf4';
        noticeBox.style.border = '1px solid #bbf7d0';
        noticeBox.style.color = '#166534';
        noticeBox.innerHTML = '<strong>Signed Out:</strong> You have been successfully signed out of your session.';
      } else if (reason === 'unauthorized') {
        noticeBox.style.display = 'block';
        noticeBox.style.background = '#fef2f2';
        noticeBox.style.border = '1px solid #fecaca';
        noticeBox.style.color = '#b91c1c';
        noticeBox.innerHTML = '<strong>Access Required:</strong> Please sign in with authorized credentials to access this system.';
      }
    }

    document.addEventListener('DOMContentLoaded', checkLogoutNotice);
  