// Main application initialization
class FocusLedgerApp {
    constructor() {
        this.initialize();
    }

    initialize() {
        this.setupGlobalErrorHandling();
        this.setupServiceWorker();
        this.setupOfflineDetection();
        this.initializeComponents();
    }

    setupGlobalErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showErrorToast('An unexpected error occurred');
        });

        // Unhandled promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorToast('An operation failed');
        });
    }

    setupServiceWorker() {
        // Register service worker for PWA capabilities
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
            });
        }
    }

    setupOfflineDetection() {
        // Handle online/offline status
        window.addEventListener('online', () => {
            this.showToast('Back online', 'success');
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline. Some features may be limited.', 'warning');
        });
    }

    initializeComponents() {
        // Initialize tooltips
        this.initializeTooltips();
        
        // Initialize form validation
        this.initializeFormValidation();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    initializeTooltips() {
        // Add tooltip functionality to elements with data-tooltip attribute
        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.showTooltip(target, target.dataset.tooltip);
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                this.hideTooltip();
            }
        });
    }

    showTooltip(element, text) {
        // Remove existing tooltip
        this.hideTooltip();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        
        // Position tooltip
        const rect = element.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
        tooltip.style.transform = 'translate(-50%, -100%)';
        
        // Add to DOM
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }

    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }

    initializeFormValidation() {
        // Add real-time validation to forms
        document.addEventListener('input', (e) => {
            const input = e.target;
            if (input.hasAttribute('data-validate')) {
                this.validateInput(input);
            }
        });
    }

    validateInput(input) {
        const value = input.value.trim();
        const type = input.dataset.validate;
        let isValid = true;
        let message = '';

        switch (type) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                isValid = emailRegex.test(value);
                message = isValid ? '' : 'Please enter a valid email address';
                break;
                
            case 'password':
                isValid = value.length >= 8;
                message = isValid ? '' : 'Password must be at least 8 characters';
                break;
                
            case 'required':
                isValid = value.length > 0;
                message = isValid ? '' : 'This field is required';
                break;
        }

        // Update UI
        input.classList.toggle('error', !isValid);
        
        // Show/hide error message
        let errorEl = input.parentElement.querySelector('.error-message');
        if (!isValid) {
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'error-message';
                input.parentElement.appendChild(errorEl);
            }
            errorEl.textContent = message;
        } else if (errorEl) {
            errorEl.remove();
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            // Ctrl/Cmd + S - Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.handleSaveShortcut();
            }

            // Ctrl/Cmd + / - Search
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.handleSearchShortcut();
            }

            // Escape - Close modals
            if (e.key === 'Escape') {
                this.handleEscapeShortcut();
            }
        });
    }

    handleSaveShortcut() {
        // Find and trigger save action based on current view
        const saveBtn = document.querySelector('[data-action="save"], .btn-primary:contains("Save")');
        if (saveBtn) {
            saveBtn.click();
        } else {
            this.showToast('No save action available', 'info');
        }
    }

    handleSearchShortcut() {
        // Focus search input if available
        const searchInput = document.querySelector('input[type="search"], .search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }

    handleEscapeShortcut() {
        // Close any open modals
        const openModal = document.querySelector('.modal:not(.hidden)');
        if (openModal) {
            openModal.querySelector('.modal-close')?.click();
        }
    }

    showToast(message, type = 'info') {
        // Use dashboard toast if available
        if (window.dashboard && typeof window.dashboard.showToast === 'function') {
            window.dashboard.showToast(message, type);
        } else {
            // Fallback toast implementation
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <div class="toast-message">${message}</div>
                <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            `;
            
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                padding: 12px 20px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                box-shadow: var(--shadow-lg);
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 5000);
        }
    }

    showErrorToast(message) {
        this.showToast(message, 'error');
    }

    // Utility methods
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FocusLedgerApp();
});

// Service Worker (sw.js content as string)
const serviceWorkerCode = `
// FocusLedger Service Worker
const CACHE_NAME = 'focusledger-v1.0.0';
const urlsToCache = [
    '/',
    '/index.html',
    '/auth.html',
    '/dashboard.html',
    '/css/main.css',
    '/css/auth.css',
    '/css/dashboard.css',
    '/js/main.js',
    '/js/auth.js',
    '/js/dashboard.js',
    '/js/timer.js',
    '/js/supabase.js',
    '/icons/timer.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
`;

// Create service worker file if needed
if (typeof window !== 'undefined') {
    // Store service worker code for registration
    window.serviceWorkerCode = serviceWorkerCode;
}