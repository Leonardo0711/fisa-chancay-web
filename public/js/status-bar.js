// status-bar.js
(function() {
  // Global helper object aliased to StatusBar to prevent breaking existing scripts
  window.StatusBar = {
    showMessage: function(msg, type = 'info') {
      const formattedMsg = (msg || '').toUpperCase();
      
      // Theme colors based on message type (high readability, clear mode)
      let bg = '#e0f2fe'; // blue 100
      let border = '#bae6fd'; // blue 200
      let color = '#0369a1'; // blue 700
      
      if (type === 'error' || type === 'danger') {
        bg = '#fee2e2'; // red 100
        border = '#fca5a5'; // red 200
        color = '#b91c1c'; // red 700
      } else if (type === 'success' || type === 'ok') {
        bg = '#d1fae5'; // emerald 100
        border = '#a7f3d0'; // emerald 200
        color = '#047857'; // emerald 700
      } else if (type === 'warning' || type === 'warn') {
        bg = '#fef3c7'; // amber 100
        border = '#fde68a'; // amber 200
        color = '#b45309'; // amber 700
      }
      
      // 1. First priority: Check if a dedicated .form-message-area is on the page
      const msgArea = document.querySelector('.form-message-area');
      if (msgArea) {
        msgArea.innerHTML = `
          <div class="static-status-message" style="
            display: block;
            padding: 10px 14px;
            border-radius: 8px;
            background: ${bg};
            color: ${color};
            border: 1px solid ${border};
            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
            font-weight: 700;
            font-size: 0.8125rem;
            letter-spacing: 0.5px;
            text-align: center;
            animation: statusFadeIn 0.2s ease-out;
          ">${formattedMsg}</div>
        `;
        
        // Setup animation in a style block if not already present
        if (!document.getElementById('status-bar-anim')) {
          const style = document.createElement('style');
          style.id = 'status-bar-anim';
          style.textContent = `
            @keyframes statusFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Clear message after 6 seconds
        if (window.statusMsgTimeout) clearTimeout(window.statusMsgTimeout);
        window.statusMsgTimeout = setTimeout(() => {
          msgArea.innerHTML = '';
        }, 6000);
        return;
      }
      
      // 2. Second priority: Find the active form, form-row, or card on the page
      const targetContainer = document.querySelector('form') || 
                              document.querySelector('.form-row') || 
                              document.querySelector('.card__body') || 
                              document.querySelector('.card');
      
      if (targetContainer) {
        // Look for an existing message container in this parent
        let msgContainer = targetContainer.querySelector('.form-status-message');
        if (!msgContainer) {
          msgContainer = document.createElement('div');
          msgContainer.className = 'form-status-message';
          targetContainer.appendChild(msgContainer);
        }
        
        msgContainer.textContent = formattedMsg;
        msgContainer.style.cssText = `
          display: block;
          margin-top: 16px;
          padding: 10px 14px;
          border-radius: 8px;
          background: ${bg};
          color: ${color};
          border: 1px solid ${border};
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.8125rem;
          letter-spacing: 0.5px;
          text-align: center;
          clear: both;
          animation: statusFadeIn 0.2s ease-out;
        `;
        
        // Setup simple keyframe animation in a style block if not already present
        if (!document.getElementById('status-bar-anim')) {
          const style = document.createElement('style');
          style.id = 'status-bar-anim';
          style.textContent = `
            @keyframes statusFadeIn {
              from { opacity: 0; transform: translateY(4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Auto-clear message after 5 seconds
        if (window.statusMsgTimeout) clearTimeout(window.statusMsgTimeout);
        window.statusMsgTimeout = setTimeout(() => {
          msgContainer.remove();
        }, 5000);
        
      } else {
        // Fallback to fixed toast (for pages without forms like login)
        const el = document.createElement('div');
        el.textContent = formattedMsg;
        
        el.style.cssText = `
          position: fixed;
          left: 50%;
          transform: translate3d(-50%, 0, 0);
          bottom: 24px;
          background: ${bg};
          color: ${color};
          border: 1px solid ${border};
          padding: 10px 16px;
          border-radius: 12px;
          z-index: 99999;
          font-family: 'Outfit', 'Inter', system-ui, sans-serif;
          font-weight: 700;
          font-size: 0.875rem;
          letter-spacing: 0.5px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
          animation: toastIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
        `;
        
        document.body.appendChild(el);
        
        setTimeout(() => {
          el.style.animation = 'toastOut 0.2s cubic-bezier(0.16, 1, 0.3, 1) both';
          setTimeout(() => el.remove(), 200);
        }, 4000);
      }
    }
  };
})();
