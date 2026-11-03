
    function switchDispatchTab(tab) {
      const btnC = document.getElementById('btnTabChallan');
      const btnL = document.getElementById('btnTabLoading');
      const paneC = document.getElementById('tabPaneChallan');
      const paneL = document.getElementById('tabPaneLoading');

      if (tab === 'loading') {
        btnC?.classList.remove('active');
        btnL?.classList.add('active');
        paneC?.classList.remove('active');
        paneL?.classList.add('active');
        if (window.DS_Dispatch) {
          DS_Dispatch.renderLoadingSheet();
        }
      } else {
        btnL?.classList.remove('active');
        btnC?.classList.add('active');
        paneL?.classList.remove('active');
        paneC?.classList.add('active');
      }
      history.replaceState(null, '', '?tab=' + tab);
    }

    document.addEventListener('DOMContentLoaded', () => {
      if (window.DS_Dispatch) {
        DS_Dispatch.initChallan();
        DS_Dispatch.initLoadingSheet();
      }

      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'loading') {
        switchDispatchTab('loading');
      } else {
        switchDispatchTab('challan');
      }
    });
  