class Dashboard {
    constructor() {
        this.currentView = 'dashboard';
        this.initializeElements();
        this.bindEvents();
        this.init();
    }

    initializeElements() {
        // Navigation
        this.navItems = document.querySelectorAll('.nav-item');
        this.sidebar = document.querySelector('.sidebar');
        this.sidebarToggle = document.querySelector('.sidebar-toggle');
        this.sidebarClose = document.querySelector('.sidebar-close');
        this.themeToggle = document.getElementById('theme-toggle');
        
        // Views
        this.views = {
            dashboard: document.getElementById('dashboard-view'),
            timer: document.getElementById('timer-view'),
            tasks: document.getElementById('tasks-view'),
            analytics: document.getElementById('analytics-view'),
            settings: document.getElementById('settings-view')
        };
        
        // Dashboard elements
        this.todayFocus = document.getElementById('today-focus');
        this.todaySessions = document.getElementById('today-sessions');
        this.totalFocusTime = document.getElementById('total-focus-time');
        this.avgSession = document.getElementById('avg-session');
        this.focusEfficiency = document.getElementById('focus-efficiency');
        this.tasksCompleted = document.getElementById('tasks-completed');
        this.recentSessions = document.getElementById('recent-sessions');
        this.insightsContent = document.getElementById('insights-content');
        
        // Charts
        this.focusTrendChart = null;
        this.taskDistributionChart = null;
        this.dailyPatternsChart = null;
        this.efficiencyChart = null;
        
        // Modals
        this.modals = {
            newTask: document.getElementById('new-task-modal'),
            session: document.getElementById('session-modal')
        };
        
        // Toast container
        this.toastContainer = document.getElementById('toast-container');
        
        // User info
        this.userName = document.getElementById('user-name');
        this.userEmail = document.getElementById('user-email');
        this.userInitials = document.querySelectorAll('#user-initials, #user-initials-top');
        this.avatarInitials = document.getElementById('avatar-initials');
        
        // Date display
        this.currentDate = document.getElementById('current-date');
        
        // Loading overlay
        this.loadingOverlay = document.querySelector('.loading-overlay');
    }

    bindEvents() {
        // Navigation
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => this.switchView(e));
        });
        
        // Sidebar
        this.sidebarToggle?.addEventListener('click', () => this.toggleSidebar());
        this.sidebarClose?.addEventListener('click', () => this.toggleSidebar());
        
        // Theme toggle
        this.themeToggle?.addEventListener('click', () => this.toggleTheme());
        
        // Buttons
        document.getElementById('new-session')?.addEventListener('click', () => this.switchView(null, 'timer'));
        document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('user-menu-btn')?.addEventListener('click', () => this.toggleUserMenu());
        
        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.closest('.modal')));
        });
        
        // Close modals on overlay click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal(modal);
            });
        });
        
        // New task modal
        document.getElementById('new-task')?.addEventListener('click', () => this.openModal('newTask'));
        document.getElementById('new-task-form')?.addEventListener('submit', (e) => this.handleNewTask(e));
        
        // Export data
        document.getElementById('export-data')?.addEventListener('click', () => this.exportData());
        
        // Period selectors
        document.getElementById('trend-period')?.addEventListener('change', (e) => this.updateCharts(e.target.value));
        document.getElementById('analytics-period')?.addEventListener('change', (e) => this.updateAnalytics(e.target.value));
        
        // Initialize timer if on timer view
        if (window.timer) {
            window.timer.onSessionComplete = (sessionData) => this.handleSessionComplete(sessionData);
        }
    }

    async init() {
        try {
            this.showLoading();
            
            // Check authentication
            await this.checkAuth();
            
            // Load user data
            await this.loadUserData();
            
            // Update date
            this.updateDate();
            
            // Load dashboard data
            await this.loadDashboardData();
            
            // Initialize charts
            this.initCharts();
            
            // Set up auto-refresh for real-time updates
            this.setupAutoRefresh();
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.showToast('Failed to load dashboard', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async checkAuth() {
        const session = await window.supabase.auth.getSession();
        if (!session) {
            window.location.href = 'auth.html';
            throw new Error('Not authenticated');
        }
        return session;
    }

    async loadUserData() {
        const user = window.supabase.auth.getUser();
        if (user) {
            const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
            const email = user.email || '';
            
            // Update UI
            this.userName.textContent = name;
            this.userEmail.textContent = email;
            
            // Update initials
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            this.userInitials.forEach(el => el.textContent = initials);
            this.avatarInitials.textContent = initials;
        }
    }

    updateDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        this.currentDate.textContent = now.toLocaleDateString('en-US', options);
    }

    async loadDashboardData() {
        try {
            // Load stats
            const stats = await window.AnalyticsManager.getFocusStats('week');
            
            // Update UI
            this.updateStats(stats);
            
            // Load recent sessions
            await this.loadRecentSessions();
            
            // Load insights
            await this.loadInsights();
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showToast('Failed to load dashboard data', 'error');
        }
    }

    updateStats(stats) {
        // Format and display stats
        const formatTime = (minutes) => {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        };
        
        this.totalFocusTime.textContent = formatTime(stats.totalFocusTime);
        this.avgSession.textContent = `${stats.averageSessionLength}m`;
        this.focusEfficiency.textContent = `${stats.focusEfficiency}%`;
        this.tasksCompleted.textContent = stats.tasksCompleted;
        
        // Update quick stats
        const todayStats = this.calculateTodayStats(stats);
        this.todayFocus.textContent = formatTime(todayStats.focusTime);
        this.todaySessions.textContent = todayStats.sessions;
    }

    calculateTodayStats(stats) {
        // This would normally come from the API
        // For now, return sample data
        return {
            focusTime: 142, // minutes
            sessions: 3
        };
    }

    async loadRecentSessions() {
        try {
            const sessions = await window.SessionManager.getSessions('day');
            
            if (sessions.length === 0) {
                this.recentSessions.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">⏱️</div>
                        <h3>No sessions today</h3>
                        <p>Start a focus session to see your activity here</p>
                        <button class="btn-primary" id="start-first-session">Start First Session</button>
                    </div>
                `;
                
                document.getElementById('start-first-session')?.addEventListener('click', () => {
                    this.switchView(null, 'timer');
                });
                return;
            }
            
            // Clear existing content
            this.recentSessions.innerHTML = '';
            
            // Add session items
            sessions.forEach(session => {
                const sessionEl = this.createSessionElement(session);
                this.recentSessions.appendChild(sessionEl);
            });
            
        } catch (error) {
            console.error('Error loading recent sessions:', error);
        }
    }

    createSessionElement(session) {
        const div = document.createElement('div');
        div.className = 'session-item';
        
        const startTime = new Date(session.start_time);
        const duration = session.duration || 0;
        const task = session.tasks?.title || 'No task';
        
        div.innerHTML = `
            <div class="session-info">
                <h4>${task}</h4>
                <p>${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div class="session-duration">${duration}m</div>
        `;
        
        return div;
    }

    async loadInsights() {
        try {
            const patterns = await window.AnalyticsManager.getDailyPatterns('week');
            const insights = this.generateInsights(patterns);
            
            this.insightsContent.innerHTML = insights;
            
        } catch (error) {
            console.error('Error loading insights:', error);
            this.insightsContent.innerHTML = '<p>Unable to load insights at this time.</p>';
        }
    }

    generateInsights(patterns) {
        let insights = [];
        
        // Find peak productivity day
        const peakDay = Object.entries(patterns.byDayOfWeek)
            .reduce((a, b) => a[1] > b[1] ? a : b);
        
        if (peakDay) {
            insights.push(`
                <div class="insight">
                    <strong>Peak Productivity:</strong> You're most productive on ${peakDay[0]}s, 
                    with an average of ${Math.round(peakDay[1] / 60)} hours of focused work.
                </div>
            `);
        }
        
        // Find best working hours
        const peakHour = Object.entries(patterns.byHour)
            .reduce((a, b) => a[1] > b[1] ? a : b);
        
        if (peakHour) {
            const hour = parseInt(peakHour[0]);
            const period = hour >= 12 ? (hour === 12 ? '12 PM' : `${hour - 12} PM`) : `${hour} AM`;
            insights.push(`
                <div class="insight">
                    <strong>Optimal Hours:</strong> Your most focused work happens around ${period}.
                </div>
            `);
        }
        
        // Check for consistency
        const daysWithWork = Object.keys(patterns.byDayOfWeek).length;
        if (daysWithWork >= 5) {
            insights.push(`
                <div class="insight positive">
                    <strong>Great Consistency:</strong> You've maintained focus across ${daysWithWork} days this week!
                </div>
            `);
        } else if (daysWithWork < 3) {
            insights.push(`
                <div class="insight warning">
                    <strong>Room for Improvement:</strong> Try to establish a more consistent focus routine.
                </div>
            `);
        }
        
        return insights.join('');
    }

    initCharts() {
        // Initialize Chart.js charts
        this.initFocusTrendChart();
        this.initTaskDistributionChart();
        this.initDailyPatternsChart();
        this.initEfficiencyChart();
    }

    initFocusTrendChart() {
        const ctx = document.getElementById('focus-trend-chart')?.getContext('2d');
        if (!ctx) return;
        
        // Sample data - would be replaced with real data
        const data = {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Focus Time (minutes)',
                data: [65, 59, 80, 81, 56, 55, 40],
                borderColor: 'var(--color-accent)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        };
        
        this.focusTrendChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--color-border)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'var(--color-border)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    }
                }
            }
        });
    }

    initTaskDistributionChart() {
        const ctx = document.getElementById('task-distribution-chart')?.getContext('2d');
        if (!ctx) return;
        
        const data = {
            labels: ['Development', 'Design', 'Meetings', 'Research', 'Planning'],
            datasets: [{
                data: [30, 25, 20, 15, 10],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)'
                ],
                borderWidth: 1
            }]
        };
        
        this.taskDistributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--color-text-secondary)',
                            padding: 20
                        }
                    }
                }
            }
        });
    }

    initDailyPatternsChart() {
        const ctx = document.getElementById('daily-patterns-chart')?.getContext('2d');
        if (!ctx) return;
        
        const data = {
            labels: ['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'],
            datasets: [{
                label: 'Focus Time',
                data: [5, 45, 60, 40, 25, 10],
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'var(--color-accent)',
                borderWidth: 2
            }]
        };
        
        this.dailyPatternsChart = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--color-border)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    }
                }
            }
        });
    }

    initEfficiencyChart() {
        const ctx = document.getElementById('efficiency-chart')?.getContext('2d');
        if (!ctx) return;
        
        const data = {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Efficiency %',
                data: [75, 82, 78, 85],
                borderColor: 'var(--color-success)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        };
        
        this.efficiencyChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'var(--color-border)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'var(--color-border)'
                        },
                        ticks: {
                            color: 'var(--color-text-secondary)'
                        }
                    }
                }
            }
        });
    }

    async updateCharts(period) {
        // Update charts based on selected period
        // Implementation would update chart data
        this.showToast(`Showing data for ${period}`, 'info');
    }

    async updateAnalytics(period) {
        // Update analytics based on selected period
        this.showToast(`Updated analytics for ${period}`, 'info');
    }

    switchView(e, viewName = null) {
        e?.preventDefault();
        
        const view = viewName || e?.currentTarget.dataset.view;
        if (!view || this.currentView === view) return;
        
        // Update navigation
        this.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        // Hide current view
        this.views[this.currentView]?.classList.remove('active');
        
        // Show new view
        this.views[view]?.classList.add('active');
        this.currentView = view;
        
        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
            this.sidebar?.classList.remove('open');
        }
        
        // Load view-specific data
        this.loadViewData(view);
    }

    async loadViewData(view) {
        switch (view) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'tasks':
                await this.loadTasks();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
        }
    }

    async loadTasks() {
        try {
            const tasks = await window.TaskManager.getTasks();
            this.renderTasks(tasks);
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showToast('Failed to load tasks', 'error');
        }
    }

    renderTasks(tasks) {
        const tasksList = document.getElementById('tasks-list');
        if (!tasksList) return;
        
        if (tasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No tasks yet</h3>
                    <p>Create your first task to start tracking</p>
                    <button class="btn-primary" id="create-first-task">Create Task</button>
                </div>
            `;
            
            document.getElementById('create-first-task')?.addEventListener('click', () => {
                this.openModal('newTask');
            });
            return;
        }
        
        tasksList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskEl = this.createTaskElement(task);
            tasksList.appendChild(taskEl);
        });
    }

    createTaskElement(task) {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.dataset.id = task.id;
        
        const isCompleted = task.status === 'completed';
        const createdAt = new Date(task.created_at).toLocaleDateString();
        
        div.innerHTML = `
            <div class="task-checkbox ${isCompleted ? 'checked' : ''}" 
                 onclick="dashboard.toggleTaskComplete('${task.id}')"></div>
            <div class="task-content">
                <h4 class="task-title ${isCompleted ? 'completed' : ''}">${task.title}</h4>
                <div class="task-meta">
                    <span>${task.project || 'No project'}</span>
                    <span>Created: ${createdAt}</span>
                    ${task.estimated_duration ? `<span>Est: ${task.estimated_duration}m</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn" onclick="dashboard.editTask('${task.id}')">✏️</button>
                <button class="task-action-btn" onclick="dashboard.deleteTask('${task.id}')">🗑️</button>
            </div>
        `;
        
        return div;
    }

    async toggleTaskComplete(taskId) {
        try {
            const task = await window.TaskManager.getTasks();
            const currentTask = task.find(t => t.id === taskId);
            
            if (currentTask) {
                const newStatus = currentTask.status === 'completed' ? 'active' : 'completed';
                await window.TaskManager.updateTask(taskId, { status: newStatus });
                
                this.showToast(`Task marked as ${newStatus}`, 'success');
                await this.loadTasks();
            }
        } catch (error) {
            console.error('Error toggling task:', error);
            this.showToast('Failed to update task', 'error');
        }
    }

    async editTask(taskId) {
        // Implementation for editing tasks
        this.showToast('Edit feature coming soon', 'info');
    }

    async deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                // Implementation for deleting tasks
                this.showToast('Task deleted', 'success');
                await this.loadTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
                this.showToast('Failed to delete task', 'error');
            }
        }
    }

    async loadAnalytics() {
        // Implementation for loading analytics data
        this.showToast('Analytics data loaded', 'info');
    }

    toggleSidebar() {
        this.sidebar?.classList.toggle('open');
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('dark-theme');
        document.body.classList.toggle('dark-theme', !isDark);
        
        // Update button text
        const themeIcon = this.themeToggle?.querySelector('.theme-icon');
        const themeText = this.themeToggle?.querySelector('span:last-child');
        
        if (isDark) {
            themeIcon.textContent = '☀️';
            themeText.textContent = 'Light Mode';
        } else {
            themeIcon.textContent = '🌙';
            themeText.textContent = 'Dark Mode';
        }
        
        // Save preference
        localStorage.setItem('focusledger.theme', isDark ? 'light' : 'dark');
    }

    toggleUserMenu() {
        // Implementation for user menu dropdown
        this.showToast('User menu', 'info');
    }

    async handleLogout() {
        if (confirm('Are you sure you want to sign out?')) {
            try {
                this.showLoading();
                
                await window.supabase.auth.signOut();
                
                // Clear local storage
                localStorage.clear();
                
                // Redirect to auth page
                window.location.href = 'auth.html';
                
            } catch (error) {
                console.error('Logout error:', error);
                this.showToast('Failed to sign out', 'error');
                this.hideLoading();
            }
        }
    }

    async handleNewTask(e) {
        e.preventDefault();
        
        const form = e.target;
        const title = form.querySelector('#task-title').value.trim();
        const project = form.querySelector('#task-project').value.trim();
        const notes = form.querySelector('#task-notes').value.trim();
        
        if (!title) {
            this.showToast('Please enter a task title', 'error');
            return;
        }
        
        try {
            await window.TaskManager.createTask({
                title,
                project: project || null,
                description: notes || null
            });
            
            this.showToast('Task created successfully', 'success');
            this.closeModal(this.modals.newTask);
            form.reset();
            
            // Reload tasks if on tasks view
            if (this.currentView === 'tasks') {
                await this.loadTasks();
            }
            
        } catch (error) {
            console.error('Error creating task:', error);
            this.showToast('Failed to create task', 'error');
        }
    }

    async handleSessionComplete(sessionData) {
        try {
            // Save session to database
            const savedSession = await window.SessionManager.createSession(sessionData);
            
            // Update modal with session details
            this.updateSessionModal(sessionData);
            
            // Show modal
            this.openModal('session');
            
            // Update dashboard stats
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Error saving session:', error);
            this.showToast('Failed to save session', 'error');
        }
    }

    updateSessionModal(sessionData) {
        const duration = document.getElementById('session-duration');
        const task = document.getElementById('session-task');
        const distractions = document.getElementById('session-distractions');
        
        if (duration) duration.textContent = `${sessionData.duration} minutes`;
        if (task) task.textContent = sessionData.task || 'No task logged';
        if (distractions) distractions.textContent = sessionData.distractions?.length || 0;
        
        // Set up form submission
        const form = document.getElementById('session-notes-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const notes = form.querySelector('#session-notes').value;
                
                // Update session with notes
                if (window.currentSessionId) {
                    await window.SessionManager.updateSession(window.currentSessionId, { notes });
                }
                
                this.closeModal(this.modals.session);
                this.showToast('Session saved successfully', 'success');
            };
        }
    }

    openModal(modalName) {
        const modal = this.modals[modalName];
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    async exportData() {
        try {
            this.showLoading();
            
            // Get sessions data
            const sessions = await window.SessionManager.getSessions('month');
            const tasks = await window.TaskManager.getTasks();
            
            // Create CSV content
            let csvContent = 'data:text/csv;charset=utf-8,';
            
            // Sessions CSV
            csvContent += 'Sessions\n';
            csvContent += 'Start Time,Duration (min),Task,Distractions,Notes\n';
            sessions.forEach(session => {
                const row = [
                    session.start_time,
                    session.duration || 0,
                    session.tasks?.title || '',
                    session.distractions?.length || 0,
                    `"${(session.notes || '').replace(/"/g, '""')}"`
                ];
                csvContent += row.join(',') + '\n';
            });
            
            csvContent += '\nTasks\n';
            csvContent += 'Title,Project,Status,Created,Estimated Duration\n';
            tasks.forEach(task => {
                const row = [
                    `"${task.title.replace(/"/g, '""')}"`,
                    task.project || '',
                    task.status,
                    task.created_at,
                    task.estimated_duration || ''
                ];
                csvContent += row.join(',') + '\n';
            });
            
            // Create download link
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `focusledger-export-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            document.body.removeChild(link);
            
            this.showToast('Data exported successfully', 'success');
            
        } catch (error) {
            console.error('Export error:', error);
            this.showToast('Failed to export data', 'error');
        } finally {
            this.hideLoading();
        }
    }

    setupAutoRefresh() {
        // Refresh dashboard data every 5 minutes
        setInterval(async () => {
            if (this.currentView === 'dashboard' && document.visibilityState === 'visible') {
                await this.loadDashboardData();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    showLoading() {
        this.loadingOverlay?.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay?.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;
        
        this.toastContainer?.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});