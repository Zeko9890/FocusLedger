class AuthManager {
    constructor() {
        this.currentTab = 'login';
        this.initializeElements();
        this.bindEvents();
        this.checkExistingSession();
    }

    initializeElements() {
        // Form elements
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
        this.loginTab = document.querySelector('[data-tab="login"]');
        this.signupTab = document.querySelector('[data-tab="signup"]');
        this.loginFormEl = document.getElementById('login-form');
        this.signupFormEl = document.getElementById('signup-form');
        
        // Loading overlay
        this.loadingOverlay = document.querySelector('.auth-loading');
        
        // Form inputs
        this.loginEmail = document.getElementById('login-email');
        this.loginPassword = document.getElementById('login-password');
        this.signupName = document.getElementById('signup-name');
        this.signupEmail = document.getElementById('signup-email');
        this.signupPassword = document.getElementById('signup-password');
        this.signupConfirm = document.getElementById('signup-confirm');
        
        // Terms checkbox
        this.termsCheckbox = document.getElementById('terms');
    }

    bindEvents() {
        // Tab switching
        this.loginTab?.addEventListener('click', () => this.switchTab('login'));
        this.signupTab?.addEventListener('click', () => this.switchTab('signup'));
        
        // Form submissions
        this.loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        this.signupForm?.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Real-time validation
        this.signupPassword?.addEventListener('input', () => this.validatePassword());
        this.signupConfirm?.addEventListener('input', () => this.validatePasswordMatch());
        
        // Google sign-in button
        document.querySelector('.btn-google')?.addEventListener('click', () => this.handleGoogleSignIn());
    }

    switchTab(tab) {
        if (this.currentTab === tab) return;
        
        this.currentTab = tab;
        
        // Update active tab styling
        this.loginTab?.classList.toggle('active', tab === 'login');
        this.signupTab?.classList.toggle('active', tab === 'signup');
        
        // Show/hide forms with animation
        this.loginFormEl?.classList.toggle('active', tab === 'login');
        this.signupFormEl?.classList.toggle('active', tab === 'signup');
        
        // Clear form errors
        this.clearFormErrors();
    }

    clearFormErrors() {
        // Remove any existing error messages
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        
        // Reset input borders
        document.querySelectorAll('.form-input').forEach(input => {
            input.classList.remove('error');
        });
    }

    showError(element, message) {
        // Remove existing error for this element
        const existingError = element.parentElement.querySelector('.error-message');
        if (existingError) existingError.remove();
        
        // Add error class to input
        element.classList.add('error');
        
        // Create and insert error message
        const errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.style.color = 'var(--color-error)';
        errorEl.style.fontSize = 'var(--font-size-xs)';
        errorEl.style.marginTop = 'var(--spacing-xs)';
        errorEl.textContent = message;
        
        element.parentElement.appendChild(errorEl);
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePassword() {
        const password = this.signupPassword.value;
        const hasMinLength = password.length >= 8;
        const hasLetter = /[A-Za-z]/.test(password);
        const hasNumber = /\d/.test(password);
        
        return hasMinLength && hasLetter && hasNumber;
    }

    validatePasswordMatch() {
        if (!this.signupPassword || !this.signupConfirm) return true;
        
        const password = this.signupPassword.value;
        const confirm = this.signupConfirm.value;
        
        return password === confirm;
    }

    async handleLogin(e) {
        e.preventDefault();
        this.clearFormErrors();
        
        const email = this.loginEmail.value.trim();
        const password = this.loginPassword.value;
        
        // Validation
        if (!email || !this.validateEmail(email)) {
            this.showError(this.loginEmail, 'Please enter a valid email address');
            return;
        }
        
        if (!password || password.length < 6) {
            this.showError(this.loginPassword, 'Password must be at least 6 characters');
            return;
        }
        
        try {
            this.showLoading();
            
            // Sign in with Supabase
            const { data, error } = await this.supabaseSignIn(email, password);
            
            if (error) throw error;
            
            // Success - redirect to dashboard
            this.showToast('Successfully signed in!', 'success');
            
            // Store user data
            if (data.user) {
                localStorage.setItem('focusledger.user', JSON.stringify(data.user));
            }
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
            
        } catch (error) {
            console.error('Login error:', error);
            this.showToast(error.message || 'Failed to sign in', 'error');
            
            // Show appropriate error message
            if (error.message.includes('Invalid login credentials')) {
                this.showError(this.loginPassword, 'Invalid email or password');
            } else {
                this.showError(this.loginEmail, error.message);
            }
        } finally {
            this.hideLoading();
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        this.clearFormErrors();
        
        const name = this.signupName.value.trim();
        const email = this.signupEmail.value.trim();
        const password = this.signupPassword.value;
        const confirm = this.signupConfirm.value;
        
        // Validation
        if (!name) {
            this.showError(this.signupName, 'Please enter your name');
            return;
        }
        
        if (!email || !this.validateEmail(email)) {
            this.showError(this.signupEmail, 'Please enter a valid email address');
            return;
        }
        
        if (!this.validatePassword()) {
            this.showError(this.signupPassword, 'Password must be at least 8 characters with letters and numbers');
            return;
        }
        
        if (!this.validatePasswordMatch()) {
            this.showError(this.signupConfirm, 'Passwords do not match');
            return;
        }
        
        if (!this.termsCheckbox.checked) {
            this.showToast('Please agree to the terms and conditions', 'error');
            return;
        }
        
        try {
            this.showLoading();
            
            // Sign up with Supabase
            const { data, error } = await this.supabaseSignUp(email, password, {
                full_name: name
            });
            
            if (error) throw error;
            
            // Success
            this.showToast('Account created successfully!', 'success');
            
            // Store user data
            if (data.user) {
                localStorage.setItem('focusledger.user', JSON.stringify(data.user));
            }
            
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showToast(error.message || 'Failed to create account', 'error');
            
            // Show appropriate error message
            if (error.message.includes('already registered')) {
                this.showError(this.signupEmail, 'Email already registered');
            } else {
                this.showError(this.signupEmail, error.message);
            }
        } finally {
            this.hideLoading();
        }
    }

    // Supabase Authentication Methods
    async supabaseSignIn(email, password) {
        const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
        
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || 'Sign in failed');
            }

            const data = await response.json();
            
            // Store session
            this.setSession(data);
            
            return { data, error: null };
        } catch (error) {
            console.error('Supabase sign in error:', error);
            return { data: null, error };
        }
    }

    async supabaseSignUp(email, password, userMetadata = {}) {
        const SUPABASE_URL = window.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
        const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE';
        
        try {
            const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ email, password, data: userMetadata })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error_description || 'Sign up failed');
            }

            const data = await response.json();
            
            // Store session
            this.setSession(data);
            
            return { data, error: null };
        } catch (error) {
            console.error('Supabase sign up error:', error);
            return { data: null, error };
        }
    }

    setSession(data) {
        if (data.access_token && data.refresh_token) {
            const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
            const session = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_at: expiresAt,
                user: data.user
            };
            localStorage.setItem('supabase.auth.token', JSON.stringify(session));
        }
    }

    async handleGoogleSignIn() {
        try {
            this.showLoading();
            this.showToast('Google sign-in is not yet implemented', 'warning');
            // Implementation would go here
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.showToast('Google sign-in failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async checkExistingSession() {
        try {
            const session = this.getSession();
            if (session) {
                // User is already logged in, redirect to dashboard
                window.location.href = 'dashboard.html';
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    getSession() {
        const sessionStr = localStorage.getItem('supabase.auth.token');
        if (!sessionStr) return null;

        try {
            const session = JSON.parse(sessionStr);
            if (session.expires_at && Date.now() >= session.expires_at * 1000) {
                this.clearSession();
                return null;
            }
            return session;
        } catch {
            this.clearSession();
            return null;
        }
    }

    clearSession() {
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('focusledger.user');
    }

    showLoading() {
        this.loadingOverlay?.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay?.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        // Add to container or create one
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 400px;
            `;
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Style the toast
        toast.style.cssText = `
            padding: 12px 16px;
            border-radius: var(--radius-md);
            background: var(--color-surface);
            border: 1px solid var(--color-border);
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s ease;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        `;
        
        // Add colored border based on type
        if (type === 'success') {
            toast.style.borderLeft = '4px solid var(--color-success)';
        } else if (type === 'error') {
            toast.style.borderLeft = '4px solid var(--color-error)';
        } else if (type === 'warning') {
            toast.style.borderLeft = '4px solid var(--color-warning)';
        } else {
            toast.style.borderLeft = '4px solid var(--color-accent)';
        }
        
        // Add animation keyframes if not already present
        if (!document.querySelector('#toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOutRight {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        }, 5000);
        
        // Close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.remove();
                }
            }, 300);
        });
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});