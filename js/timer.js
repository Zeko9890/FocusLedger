class FocusTimer {
    constructor() {
        this.state = {
            isRunning: false,
            isPaused: false,
            isBreak: false,
            startTime: null,
            elapsedTime: 0,
            lastUpdateTime: null,
            currentTask: null,
            distractions: [],
            sessionId: null
        };
        
        this.settings = {
            focusDuration: 25, // minutes
            breakDuration: 5,  // minutes
            autoStartBreak: false,
            notifications: true
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        this.updateDisplay();
    }
    
    initializeElements() {
        // Timer display
        this.timerDisplay = document.getElementById('timer-display');
        this.timerMode = document.getElementById('timer-mode');
        
        // Control buttons
        this.startBtn = document.getElementById('start-timer');
        this.pauseBtn = document.getElementById('pause-timer');
        this.stopBtn = document.getElementById('stop-timer');
        this.resetBtn = document.getElementById('reset-timer');
        this.saveBtn = document.getElementById('save-session');
        
        // Settings sliders
        this.focusSlider = document.getElementById('focus-duration');
        this.breakSlider = document.getElementById('break-duration');
        this.focusValue = document.getElementById('focus-value');
        this.breakValue = document.getElementById('break-value');
        
        // Task logging
        this.taskInput = document.getElementById('task-input');
        this.logTaskBtn = document.getElementById('log-task');
        this.currentTaskDisplay = document.getElementById('current-task-display');
        
        // Distraction logging
        this.distractionInput = document.getElementById('distraction-input');
        this.logDistractionBtn = document.getElementById('log-distraction');
        this.distractionsList = document.getElementById('distractions-list');
        
        // Modal elements
        this.sessionModal = document.getElementById('session-modal');
        
        // Audio for notifications
        this.audio = {
            focusEnd: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='), // Simple beep
            breakEnd: new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==')
        };
    }
    
    bindEvents() {
        // Control buttons
        this.startBtn?.addEventListener('click', () => this.start());
        this.pauseBtn?.addEventListener('click', () => this.pause());
        this.stopBtn?.addEventListener('click', () => this.stop());
        this.resetBtn?.addEventListener('click', () => this.reset());
        this.saveBtn?.addEventListener('click', () => this.saveSession());
        
        // Settings sliders
        this.focusSlider?.addEventListener('input', (e) => this.updateFocusDuration(e.target.value));
        this.breakSlider?.addEventListener('input', (e) => this.updateBreakDuration(e.target.value));
        
        // Task logging
        this.logTaskBtn?.addEventListener('click', () => this.logTask());
        this.taskInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.logTask();
        });
        
        // Distraction logging
        this.logDistractionBtn?.addEventListener('click', () => this.logDistraction());
        this.distractionInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.logDistraction();
        });
        
        // Load saved settings
        window.addEventListener('beforeunload', () => this.saveSettings());
        
        // Visibility change (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.state.isRunning && !this.state.isPaused) {
                this.handleVisibilityChange();
            }
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('focusledger.timerSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.focusSlider.value = this.settings.focusDuration;
            this.breakSlider.value = this.settings.breakDuration;
            this.updateSliderValues();
        }
    }
    
    saveSettings() {
        localStorage.setItem('focusledger.timerSettings', JSON.stringify(this.settings));
    }
    
    updateFocusDuration(value) {
        this.settings.focusDuration = parseInt(value);
        this.updateSliderValues();
        
        if (!this.state.isRunning && !this.state.isBreak) {
            this.state.elapsedTime = 0;
            this.updateDisplay();
        }
    }
    
    updateBreakDuration(value) {
        this.settings.breakDuration = parseInt(value);
        this.updateSliderValues();
    }
    
    updateSliderValues() {
        if (this.focusValue) this.focusValue.textContent = `${this.settings.focusDuration} min`;
        if (this.breakValue) this.breakValue.textContent = `${this.settings.breakDuration} min`;
    }
    
    start() {
        if (this.state.isRunning) return;
        
        // If resuming from pause
        if (this.state.isPaused) {
            this.state.isPaused = false;
            this.state.lastUpdateTime = Date.now();
        } else {
            // Starting a new session
            this.state.startTime = Date.now();
            this.state.lastUpdateTime = this.state.startTime;
            this.state.elapsedTime = 0;
            this.state.isBreak = false;
            this.state.distractions = [];
            
            // Create a new session ID
            this.state.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            window.currentSessionId = this.state.sessionId;
        }
        
        this.state.isRunning = true;
        this.updateControls();
        this.startTick();
        
        // Show notification
        if (this.settings.notifications && Notification.permission === 'granted') {
            new Notification('Focus Session Started', {
                body: this.state.isBreak ? 'Break time!' : 'Time to focus!',
                icon: '/icons/timer.svg'
            });
        }
    }
    
    pause() {
        if (!this.state.isRunning || this.state.isPaused) return;
        
        this.state.isPaused = true;
        this.state.isRunning = false;
        
        // Update elapsed time
        if (this.state.lastUpdateTime) {
            this.state.elapsedTime += Date.now() - this.state.lastUpdateTime;
        }
        
        this.updateControls();
        
        // Auto-log distraction on pause
        if (this.state.elapsedTime > 60000) { // Only if more than 1 minute elapsed
            this.logDistraction('Session paused');
        }
    }
    
    stop() {
        if (!this.state.isRunning && !this.state.isPaused) return;
        
        const wasRunning = this.state.isRunning;
        const wasBreak = this.state.isBreak;
        
        // Calculate final elapsed time
        if (this.state.isRunning && !this.state.isPaused && this.state.lastUpdateTime) {
            this.state.elapsedTime += Date.now() - this.state.lastUpdateTime;
        }
        
        // Reset state
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.lastUpdateTime = null;
        
        this.updateControls();
        this.updateDisplay();
        
        // If we were in a focus session and it was running (not paused), complete it
        if (wasRunning && !wasBreak && this.state.elapsedTime > 0) {
            this.completeSession();
        }
    }
    
    reset() {
        const confirmReset = confirm('Are you sure you want to reset the timer? This will clear the current session.');
        
        if (confirmReset) {
            this.stop();
            this.state.elapsedTime = 0;
            this.state.currentTask = null;
            this.state.distractions = [];
            this.state.sessionId = null;
            
            this.updateDisplay();
            this.updateCurrentTaskDisplay();
            this.updateDistractionsList();
        }
    }
    
    startTick() {
        if (!this.state.isRunning || this.state.isPaused) return;
        
        const tick = () => {
            if (!this.state.isRunning || this.state.isPaused) return;
            
            // Calculate elapsed time
            const now = Date.now();
            const elapsed = this.state.elapsedTime + (now - this.state.lastUpdateTime);
            this.state.lastUpdateTime = now;
            
            // Check if session is complete
            const targetTime = (this.state.isBreak ? this.settings.breakDuration : this.settings.focusDuration) * 60 * 1000;
            
            if (elapsed >= targetTime) {
                this.completePhase();
            } else {
                this.state.elapsedTime = elapsed;
                this.updateDisplay();
                
                // Schedule next tick
                requestAnimationFrame(tick);
            }
        };
        
        requestAnimationFrame(tick);
    }
    
    completePhase() {
        const wasBreak = this.state.isBreak;
        
        // Stop current phase
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.elapsedTime = 0;
        
        // Play sound
        if (this.settings.notifications) {
            const audio = wasBreak ? this.audio.breakEnd : this.audio.focusEnd;
            audio.currentTime = 0;
            audio.play().catch(e => console.log('Audio play failed:', e));
        }
        
        // Show notification
        if (this.settings.notifications && Notification.permission === 'granted') {
            new Notification(wasBreak ? 'Break Complete' : 'Focus Session Complete', {
                body: wasBreak ? 'Time to get back to work!' : 'Great job! Take a break.',
                icon: '/icons/timer.svg'
            });
        }
        
        // If focus session just ended
        if (!wasBreak) {
            this.completeSession();
            
            // Auto-start break if enabled
            if (this.settings.autoStartBreak) {
                setTimeout(() => {
                    this.state.isBreak = true;
                    this.start();
                }, 1000);
            } else {
                this.state.isBreak = true;
                this.updateDisplay();
                this.updateControls();
            }
        } else {
            // Break ended
            this.state.isBreak = false;
            this.updateDisplay();
            this.updateControls();
        }
    }
    
    completeSession() {
        const sessionData = {
            duration: Math.round(this.state.elapsedTime / 60000), // Convert to minutes
            task: this.state.currentTask,
            distractions: this.state.distractions,
            focusScore: this.calculateFocusScore(),
            timestamp: new Date().toISOString()
        };
        
        // Notify dashboard if available
        if (window.dashboard && typeof window.dashboard.handleSessionComplete === 'function') {
            window.dashboard.handleSessionComplete(sessionData);
        } else {
            // Store session locally if dashboard not available
            this.saveSessionLocal(sessionData);
        }
    }
    
    calculateFocusScore() {
        const durationMinutes = this.state.elapsedTime / 60000;
        const distractionCount = this.state.distractions.length;
        
        // Simple scoring algorithm
        let score = 100;
        
        // Deduct points for distractions
        score -= distractionCount * 5;
        
        // Deduct points for short sessions (less than 10 minutes)
        if (durationMinutes < 10) {
            score -= 20;
        }
        
        // Ensure score is between 0-100
        return Math.max(0, Math.min(100, Math.round(score)));
    }
    
    async saveSession() {
        if (this.state.isRunning && !this.state.isBreak) {
            this.stop();
        }
        
        if (this.state.elapsedTime > 0 && !this.state.isBreak) {
            this.completeSession();
        } else {
            this.showToast('No active focus session to save', 'warning');
        }
    }
    
    saveSessionLocal(sessionData) {
        const sessions = JSON.parse(localStorage.getItem('focusledger.sessions') || '[]');
        sessions.push(sessionData);
        localStorage.setItem('focusledger.sessions', JSON.stringify(sessions));
        
        this.showToast('Session saved locally', 'success');
    }
    
    logTask() {
        const task = this.taskInput?.value.trim();
        if (!task) {
            this.showToast('Please enter a task description', 'warning');
            return;
        }
        
        this.state.currentTask = task;
        this.updateCurrentTaskDisplay();
        
        // Clear input
        if (this.taskInput) this.taskInput.value = '';
        
        // Show success message
        this.showToast('Task logged successfully', 'success');
        
        // If timer is running, log this as a task change
        if (this.state.isRunning && !this.state.isPaused) {
            this.logDistraction('Task changed');
        }
    }
    
    updateCurrentTaskDisplay() {
        if (this.currentTaskDisplay) {
            if (this.state.currentTask) {
                this.currentTaskDisplay.textContent = this.state.currentTask;
                this.currentTaskDisplay.style.color = 'var(--color-success)';
                this.currentTaskDisplay.style.fontWeight = '600';
            } else {
                this.currentTaskDisplay.textContent = 'No task logged for this session';
                this.currentTaskDisplay.style.color = 'var(--color-text-tertiary)';
                this.currentTaskDisplay.style.fontWeight = '400';
            }
        }
    }
    
    logDistraction(description = null) {
        const distraction = description || this.distractionInput?.value.trim();
        if (!distraction) {
            this.showToast('Please enter a distraction description', 'warning');
            return;
        }
        
        const distractionRecord = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            description: distraction,
            sessionTime: Math.round(this.state.elapsedTime / 60000)
        };
        
        this.state.distractions.push(distractionRecord);
        this.updateDistractionsList();
        
        // Clear input if from input field
        if (!description && this.distractionInput) {
            this.distractionInput.value = '';
        }
        
        // Show notification if timer is running
        if (this.state.isRunning && !this.state.isPaused) {
            this.showToast('Distraction logged', 'info');
        }
    }
    
    updateDistractionsList() {
        if (!this.distractionsList) return;
        
        if (this.state.distractions.length === 0) {
            this.distractionsList.innerHTML = `
                <div class="empty-state small">
                    No distractions logged yet
                </div>
            `;
            return;
        }
        
        // Show only recent distractions
        const recentDistractions = this.state.distractions.slice(-5).reverse();
        
        this.distractionsList.innerHTML = recentDistractions.map(distraction => `
            <div class="distraction-item">
                <span>${distraction.description}</span>
                <span class="distraction-time">${distraction.sessionTime}m</span>
            </div>
        `).join('');
    }
    
    handleVisibilityChange() {
        // Log a distraction when user switches tabs during focus
        if (this.state.isRunning && !this.state.isBreak && !this.state.isPaused) {
            this.logDistraction('Tab switched/App hidden');
        }
    }
    
    updateDisplay() {
        if (!this.timerDisplay || !this.timerMode) return;
        
        let displayTime;
        
        if (this.state.isRunning || this.state.isPaused) {
            const remaining = this.calculateRemainingTime();
            displayTime = this.formatTime(remaining);
        } else {
            const targetMinutes = this.state.isBreak ? this.settings.breakDuration : this.settings.focusDuration;
            displayTime = this.formatTime(targetMinutes * 60);
        }
        
        this.timerDisplay.textContent = displayTime;
        
        // Update mode display
        this.timerMode.textContent = this.state.isBreak ? 'BREAK' : 'FOCUS';
        this.timerMode.classList.toggle('break-mode', this.state.isBreak);
        
        // Update document title
        document.title = `${displayTime} - ${this.state.isBreak ? 'Break' : 'Focus'} | FocusLedger`;
    }
    
    calculateRemainingTime() {
        const targetTime = (this.state.isBreak ? this.settings.breakDuration : this.settings.focusDuration) * 60 * 1000;
        const elapsed = this.state.elapsedTime + (this.state.isRunning && !this.state.isPaused ? Date.now() - this.state.lastUpdateTime : 0);
        return Math.max(0, targetTime - elapsed) / 1000; // Convert to seconds
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    updateControls() {
        if (!this.startBtn || !this.pauseBtn || !this.stopBtn) return;
        
        const isActive = this.state.isRunning || this.state.isPaused;
        
        // Start button
        this.startBtn.disabled = this.state.isRunning;
        this.startBtn.querySelector('span').textContent = this.state.isPaused ? 'Resume' : 'Start';
        
        // Pause button
        this.pauseBtn.disabled = !this.state.isRunning || this.state.isPaused;
        
        // Stop button
        this.stopBtn.disabled = !isActive;
        
        // Reset button (in dashboard.js)
        if (this.resetBtn) {
            this.resetBtn.disabled = !isActive && this.state.elapsedTime === 0;
        }
        
        // Save button
        if (this.saveBtn) {
            this.saveBtn.disabled = !isActive && this.state.elapsedTime === 0;
        }
        
        // Disable settings during active session
        const disableSettings = isActive;
        if (this.focusSlider) this.focusSlider.disabled = disableSettings;
        if (this.breakSlider) this.breakSlider.disabled = disableSettings;
    }
    
    showToast(message, type = 'info') {
        if (window.dashboard && typeof window.dashboard.showToast === 'function') {
            window.dashboard.showToast(message, type);
        } else {
            // Fallback toast
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
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
            }, 3000);
        }
    }
    
    // Public methods for dashboard integration
    setOnSessionComplete(callback) {
        this.onSessionComplete = callback;
    }
    
    getCurrentState() {
        return { ...this.state, settings: { ...this.settings } };
    }
}

// Initialize timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    window.timer = new FocusTimer();
});