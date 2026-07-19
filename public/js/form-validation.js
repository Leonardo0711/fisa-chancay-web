// form-validation.js
(function() {
  window.FormValidator = {
    /**
     * Validates required inputs in a form.
     * Applies invalid states to inputs and groups, focusing the first failed field.
     */
    validateForm: function(formEl) {
      if (!formEl) return true;
      let isValid = true;
      let firstFailedInput = null;
      
      const inputs = formEl.querySelectorAll('input[required], select[required], textarea[required]');
      
      inputs.forEach(input => {
        const group = input.closest('.form-group');
        let inputValid = true;
        
        if (input.type === 'checkbox') {
          inputValid = input.checked;
        } else {
          inputValid = input.value.trim().length > 0;
        }
        
        if (!inputValid) {
          isValid = false;
          input.classList.add('is-invalid');
          if (group) {
            group.classList.add('has-error');
          }
          if (!firstFailedInput) {
            firstFailedInput = input;
          }
        } else {
          input.classList.remove('is-invalid');
          if (group) {
            group.classList.remove('has-error');
          }
        }
      });
      
      // Auto-focus the first invalid element
      if (firstFailedInput) {
        firstFailedInput.focus();
      }
      
      return isValid;
    },
    
    /**
     * Attaches change/input listeners to automatically clear invalid styling upon user action.
     */
    setupAutoClear: function(formEl) {
      if (!formEl) return;
      const inputs = formEl.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        const clearErr = () => {
          input.classList.remove('is-invalid');
          const group = input.closest('.form-group') || input.closest('.field');
          if (group) {
            group.classList.remove('has-error');
          }
        };
        input.addEventListener('input', clearErr);
        input.addEventListener('change', clearErr);
      });
    },
    
    /**
     * Clears all validation errors and styling from a form.
     */
    clearValidation: function(formEl) {
      if (!formEl) return;
      const inputs = formEl.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.classList.remove('is-invalid');
        const group = input.closest('.form-group') || input.closest('.field');
        if (group) {
          group.classList.remove('has-error');
        }
      });
    }
  };
})();
