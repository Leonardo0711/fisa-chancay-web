// public/js/searchable-select.js
// Componente de Select Buscable con Altura Limitada y Filtrado en Tiempo Real para Chancay Web
(function() {
  'use strict';

  function normalizeStr(str) {
    if (!str) return '';
    return str
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  class SearchableSelectInstance {
    constructor(selectEl) {
      this.select = selectEl;
      if (this.select._searchableInstance) {
        return this.select._searchableInstance;
      }
      this.select._searchableInstance = this;

      this.isOpen = false;
      this.highlightedIndex = -1;
      this.optionsData = [];
      this.visibleIndices = [];

      this.buildDOM();
      this.sync();
      this.bindEvents();
      this.setupObserver();
    }

    buildDOM() {
      // Ocultar select nativo
      this.select.style.display = 'none';
      this.select.setAttribute('tabindex', '-1');
      this.select.setAttribute('aria-hidden', 'true');

      // Crear wrapper
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'custom-select-wrap';
      if (this.select.id) {
        this.wrapper.setAttribute('data-select-id', this.select.id);
      }

      // Copiar clases relevantes o estilos de ancho
      if (this.select.classList.contains('input--search')) {
        this.wrapper.classList.add('custom-select-wrap--search');
      }

      // Control (Input + Iconos)
      this.control = document.createElement('div');
      this.control.className = 'custom-select-control';

      this.input = document.createElement('input');
      this.input.type = 'text';
      this.input.className = 'input custom-select-input';
      this.input.autocomplete = 'off';
      this.input.spellcheck = false;
      this.input.placeholder = this.getPlaceholder();

      this.iconsWrap = document.createElement('div');
      this.iconsWrap.className = 'custom-select-icons';

      this.clearBtn = document.createElement('button');
      this.clearBtn.type = 'button';
      this.clearBtn.className = 'custom-select-clear';
      this.clearBtn.innerHTML = '&times;';
      this.clearBtn.tabIndex = -1;
      this.clearBtn.title = 'Limpiar selección';

      this.chevron = document.createElement('span');
      this.chevron.className = 'custom-select-chevron';
      this.chevron.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

      this.iconsWrap.appendChild(this.clearBtn);
      this.iconsWrap.appendChild(this.chevron);
      this.control.appendChild(this.input);
      this.control.appendChild(this.iconsWrap);

      // Menú Desplegable con altura limitada
      this.dropdown = document.createElement('div');
      this.dropdown.className = 'custom-select-dropdown';

      this.optionsList = document.createElement('div');
      this.optionsList.className = 'custom-select-options';

      this.emptyMsg = document.createElement('div');
      this.emptyMsg.className = 'custom-select-empty';
      this.emptyMsg.textContent = 'No se encontraron opciones coincidentes';

      this.dropdown.appendChild(this.optionsList);
      this.dropdown.appendChild(this.emptyMsg);

      this.wrapper.appendChild(this.control);
      this.wrapper.appendChild(this.dropdown);

      // Insertar wrapper en el DOM justo después del select
      this.select.parentNode.insertBefore(this.wrapper, this.select.nextSibling);
    }

    getPlaceholder() {
      const firstOpt = this.select.options[0];
      if (firstOpt && (firstOpt.value === '' || firstOpt.disabled)) {
        return firstOpt.textContent.trim();
      }
      return this.select.getAttribute('placeholder') || 'SELECCIONE UNA OPCIÓN';
    }

    sync() {
      // Reconstruir lista de opciones a partir del select nativo
      this.optionsData = [];
      const opts = Array.from(this.select.options);

      opts.forEach((opt, idx) => {
        const val = opt.value;
        const text = opt.textContent.trim();
        const isPlaceholder = (val === '' && idx === 0) || opt.disabled;
        
        this.optionsData.push({
          index: idx,
          value: val,
          text: text,
          normalized: normalizeStr(text + ' ' + val),
          isPlaceholder: isPlaceholder,
          disabled: opt.disabled,
          selected: opt.selected
        });
      });

      // Actualizar estado disabled
      if (this.select.disabled) {
        this.wrapper.classList.add('is-disabled');
        this.input.disabled = true;
      } else {
        this.wrapper.classList.remove('is-disabled');
        this.input.disabled = false;
      }

      // Actualizar valor visual del input
      this.updateInputValue();
      this.renderOptionsList();
    }

    updateInputValue() {
      const selectedIndex = this.select.selectedIndex;
      if (selectedIndex >= 0 && selectedIndex < this.select.options.length) {
        const opt = this.select.options[selectedIndex];
        if (opt && opt.value !== '') {
          this.input.value = opt.textContent.trim();
          this.clearBtn.style.display = 'inline-flex';
          this.wrapper.classList.add('has-value');
          return;
        }
      }
      this.input.value = '';
      this.input.placeholder = this.getPlaceholder();
      this.clearBtn.style.display = 'none';
      this.wrapper.classList.remove('has-value');
    }

    renderOptionsList(filterText = '') {
      this.optionsList.innerHTML = '';
      const normQuery = normalizeStr(filterText);
      this.visibleIndices = [];

      let hasMatches = false;

      this.optionsData.forEach(item => {
        // Ignorar placeholder vacío como opción seleccionable si hay búsqueda
        if (item.isPlaceholder && normQuery) return;

        const matches = !normQuery || item.normalized.includes(normQuery);

        if (matches) {
          hasMatches = true;
          this.visibleIndices.push(item.index);

          const optDiv = document.createElement('div');
          optDiv.className = 'custom-select-option';
          if (item.value === this.select.value && item.value !== '') {
            optDiv.classList.add('is-selected');
          }
          if (item.isPlaceholder) {
            optDiv.classList.add('is-placeholder-opt');
          }

          // Resaltado de texto coincidente si hay búsqueda
          if (normQuery && !item.isPlaceholder) {
            optDiv.innerHTML = this.highlightMatch(item.text, filterText);
          } else {
            optDiv.textContent = item.text;
          }

          optDiv.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevenir que el input pierda foco antes de seleccionar
            this.selectOption(item.index);
          });

          this.optionsList.appendChild(optDiv);
        }
      });

      if (!hasMatches) {
        this.emptyMsg.style.display = 'block';
      } else {
        this.emptyMsg.style.display = 'none';
      }

      this.highlightedIndex = -1;
    }

    highlightMatch(text, query) {
      if (!query) return text;
      const q = query.trim();
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="custom-select-match">$1</mark>');
    }

    updatePosition() {
      if (!this.isOpen) return;
      const rect = this.wrapper.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const maxDropdownHeight = 210;

      // Solo abrir hacia arriba si REALMENTE falta espacio abajo (< 130px) Y hay buen espacio arriba (>= 220px)
      const shouldOpenAbove = (spaceBelow < 130) && (spaceAbove >= 220);

      if (shouldOpenAbove) {
        this.wrapper.classList.add('is-open-above');
        this.wrapper.classList.remove('is-open-below');
        const availableHeight = Math.max(100, Math.min(maxDropdownHeight, Math.floor(spaceAbove - 30)));
        this.dropdown.style.maxHeight = `${availableHeight}px`;
      } else {
        this.wrapper.classList.remove('is-open-above');
        this.wrapper.classList.add('is-open-below');
        const availableHeight = Math.max(120, Math.min(maxDropdownHeight, Math.floor(spaceBelow - 20)));
        this.dropdown.style.maxHeight = `${availableHeight}px`;
      }
    }

    open() {
      if (this.select.disabled || this.isOpen) return;
      
      // Cerrar otros dropdowns abiertos
      document.querySelectorAll('.custom-select-wrap.is-open').forEach(w => {
        if (w !== this.wrapper && w._instance) {
          w._instance.close();
        }
      });

      this.isOpen = true;
      this.wrapper.classList.add('is-open');
      this.wrapper._instance = this;
      this.dropdown.scrollTop = 0;

      // Elevar todas las tarjetas y contenedores ancestros para que ningún elemento hermano tape el menú
      let el = this.wrapper.parentElement;
      while (el && el !== document.body) {
        if (el.classList.contains('card') || el.classList.contains('produccion-grid') || el.classList.contains('form-row') || el.classList.contains('field') || el.classList.contains('usr-stack')) {
          el.classList.add('has-open-select');
        }
        el = el.parentElement;
      }

      // Calcular orientación (arriba/abajo) y altura disponible
      this.updatePosition();

      // Al abrir, filtrar según lo que haya o mostrar todo
      this.renderOptionsList(this.input.value);

      // Auto-seleccionar todo el texto para poder escribir encima inmediatamente
      setTimeout(() => {
        this.input.select();
        this.updatePosition();
      }, 10);
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.wrapper.classList.remove('is-open', 'is-open-above', 'is-open-below');
      this.dropdown.style.maxHeight = '';
      this.highlightedIndex = -1;

      // Remover elevación de ancestros
      let el = this.wrapper.parentElement;
      while (el && el !== document.body) {
        if (el.classList.contains('has-open-select')) {
          el.classList.remove('has-open-select');
        }
        el = el.parentElement;
      }

      this.updateInputValue();
    }

    selectOption(optIndex) {
      const opt = this.optionsData.find(o => o.index === optIndex);
      if (!opt) return;

      this.select.selectedIndex = opt.index;
      this.select.value = opt.value;
      
      // Disparar eventos nativos para que los listeners de change/input se ejecuten
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
      this.select.dispatchEvent(new Event('input', { bubbles: true }));

      this.updateInputValue();
      this.close();
      this.input.focus();
    }

    clearSelection() {
      this.select.selectedIndex = 0;
      this.select.value = '';
      this.select.dispatchEvent(new Event('change', { bubbles: true }));
      this.select.dispatchEvent(new Event('input', { bubbles: true }));
      this.updateInputValue();
      this.renderOptionsList('');
      this.input.focus();
    }

    bindEvents() {
      // Focus o Clic en input -> Abrir
      this.input.addEventListener('focus', () => {
        this.open();
      });

      this.input.addEventListener('click', () => {
        if (!this.isOpen) {
          this.open();
        }
      });

      // Escribir en tiempo real -> Filtrar opciones instantáneamente
      this.input.addEventListener('input', (e) => {
        if (!this.isOpen) {
          this.open();
        }
        const val = this.input.value;
        this.renderOptionsList(val);
        this.clearBtn.style.display = val ? 'inline-flex' : 'none';
      });

      // Limpiar selección
      this.clearBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.clearSelection();
      });

      // Navegación por teclado (Flechas, Enter, Escape, Tab)
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
            return;
          }
          this.moveHighlight(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
            return;
          }
          this.moveHighlight(-1);
        } else if (e.key === 'Enter') {
          if (this.isOpen) {
            e.preventDefault();
            this.selectHighlighted();
          }
        } else if (e.key === 'Escape') {
          if (this.isOpen) {
            e.preventDefault();
            this.close();
          }
        } else if (e.key === 'Tab') {
          this.close();
        }
      });

      // Clic fuera del wrapper -> Cerrar
      document.addEventListener('click', (e) => {
        if (!this.wrapper.contains(e.target) && e.target !== this.select) {
          this.close();
        }
      });

      // Reposicionar dinámicamente ante scroll o resize
      window.addEventListener('resize', () => {
        if (this.isOpen) {
          this.updatePosition();
        }
      }, { passive: true });

      window.addEventListener('scroll', () => {
        if (this.isOpen) {
          this.updatePosition();
        }
      }, { passive: true, capture: true });
    }

    moveHighlight(direction) {
      const renderedOptions = Array.from(this.optionsList.querySelectorAll('.custom-select-option'));
      if (renderedOptions.length === 0) return;

      this.highlightedIndex += direction;
      if (this.highlightedIndex < 0) this.highlightedIndex = 0;
      if (this.highlightedIndex >= renderedOptions.length) {
        this.highlightedIndex = renderedOptions.length - 1;
      }

      renderedOptions.forEach((el, idx) => {
        if (idx === this.highlightedIndex) {
          el.classList.add('is-highlighted');
          el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
          el.classList.remove('is-highlighted');
        }
      });
    }

    selectHighlighted() {
      const renderedOptions = Array.from(this.optionsList.querySelectorAll('.custom-select-option'));
      if (renderedOptions.length === 0) return;

      let targetIdx = this.highlightedIndex;
      if (targetIdx === -1 && renderedOptions.length > 0) {
        targetIdx = 0; // Si no hay nada resaltado pero presiona Enter, toma el primer visible
      }

      const optIndex = this.visibleIndices[targetIdx];
      if (typeof optIndex !== 'undefined') {
        this.selectOption(optIndex);
      }
    }

    setupObserver() {
      // MutationObserver para detectar cambios en <select> (nuevas opciones, disabled, etc.)
      const observer = new MutationObserver(() => {
        this.sync();
      });

      observer.observe(this.select, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['disabled', 'class', 'style', 'value']
      });

      // Hook en setters de value y selectedIndex para reflejar cambios externos inmediatos
      const self = this;
      const valDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
      const idxDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

      if (valDescriptor && valDescriptor.set) {
        Object.defineProperty(this.select, 'value', {
          get() {
            return valDescriptor.get.call(this);
          },
          set(val) {
            valDescriptor.set.call(this, val);
            self.updateInputValue();
          },
          configurable: true
        });
      }

      if (idxDescriptor && idxDescriptor.set) {
        Object.defineProperty(this.select, 'selectedIndex', {
          get() {
            return idxDescriptor.get.call(this);
          },
          set(idx) {
            idxDescriptor.set.call(this, idx);
            self.updateInputValue();
          },
          configurable: true
        });
      }

      // Escuchar también evento 'change' disparado externamente en el select nativo
      this.select.addEventListener('change', () => {
        this.updateInputValue();
      });
    }
  }

  // Objeto Global
  window.SearchableSelect = {
    init: function(selectEl) {
      if (!selectEl) return null;
      if (typeof selectEl === 'string') {
        selectEl = document.querySelector(selectEl);
      }
      if (!selectEl || selectEl.tagName !== 'SELECT') return null;
      return new SearchableSelectInstance(selectEl);
    },

    sync: function(selectEl) {
      if (typeof selectEl === 'string') {
        selectEl = document.querySelector(selectEl);
      }
      if (selectEl && selectEl._searchableInstance) {
        selectEl._searchableInstance.sync();
      }
    },

    initAll: function(selector = 'select:not(.no-searchable)') {
      document.querySelectorAll(selector).forEach(sel => {
        // Ignorar selects de pagination o con clase no-searchable
        if (!sel.classList.contains('no-searchable')) {
          new SearchableSelectInstance(sel);
        }
      });
    }
  };

  // Inicializar automáticamente cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SearchableSelect.initAll());
  } else {
    window.SearchableSelect.initAll();
  }
})();
