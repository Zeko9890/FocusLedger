// Supabase Configuration
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Supabase Client
const supabaseClient = {
    auth: {
        async signIn(email, password) {
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
                this.setSession(data);
                return data;
            } catch (error) {
                console.error('Sign in error:', error);
                throw error;
            }
        },

        async signUp(email, password, userMetadata = {}) {
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
                this.setSession(data);
                return data;
            } catch (error) {
                console.error('Sign up error:', error);
                throw error;
            }
        },

        async signOut() {
            try {
                const accessToken = this.getAccessToken();
                
                if (accessToken) {
                    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'apikey': SUPABASE_ANON_KEY
                        }
                    });
                }

                this.clearSession();
                return true;
            } catch (error) {
                console.error('Sign out error:', error);
                throw error;
            }
        },

        async getSession() {
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
        },

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
        },

        clearSession() {
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('focusledger.user');
        },

        getAccessToken() {
            const session = this.getSession();
            return session ? session.access_token : null;
        },

        getUser() {
            const session = this.getSession();
            return session ? session.user : null;
        }
    },

    from(table) {
        return {
            select: (columns = '*') => this._query(table, 'GET', columns),
            insert: (data) => this._query(table, 'POST', null, data),
            update: (data) => this._query(table, 'PATCH', null, data),
            delete: () => this._query(table, 'DELETE'),
            eq: (column, value) => {
                this._addFilter(column, 'eq', value);
                return this;
            },
            order: (column, { ascending = true } = {}) => {
                this._addOrder(column, ascending);
                return this;
            },
            limit: (count) => {
                this._addLimit(count);
                return this;
            }
        };
    },

    _currentQuery: null,

    async _query(table, method, columns = null, data = null) {
        const accessToken = this.auth.getAccessToken();
        const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);

        // Add select parameters
        if (columns && method === 'GET') {
            url.searchParams.append('select', columns);
        }

        // Add filters
        if (this._currentQuery?.filters) {
            this._currentQuery.filters.forEach(filter => {
                url.searchParams.append(filter.column, `${filter.operator}.${filter.value}`);
            });
        }

        // Add order
        if (this._currentQuery?.order) {
            url.searchParams.append('order', `${this._currentQuery.order.column}.${this._currentQuery.order.ascending ? 'asc' : 'desc'}`);
        }

        // Add limit
        if (this._currentQuery?.limit) {
            url.searchParams.append('limit', this._currentQuery.limit);
        }

        const headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Prefer': 'return=representation'
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const options = {
            method,
            headers
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (method === 'DELETE') {
                return { data: [], error: null };
            }

            const result = await response.json();
            return { data: result, error: null };
        } catch (error) {
            console.error('Supabase query error:', error);
            return { data: null, error };
        } finally {
            // Reset current query
            this._currentQuery = null;
        }
    },

    _addFilter(column, operator, value) {
        if (!this._currentQuery) {
            this._currentQuery = { filters: [] };
        }
        if (!this._currentQuery.filters) {
            this._currentQuery.filters = [];
        }
        this._currentQuery.filters.push({ column, operator, value });
    },

    _addOrder(column, ascending) {
        if (!this._currentQuery) {
            this._currentQuery = {};
        }
        this._currentQuery.order = { column, ascending };
    },

    _addLimit(count) {
        if (!this._currentQuery) {
            this._currentQuery = {};
        }
        this._currentQuery.limit = count;
    },

    rpc(fn, params) {
        return this._rpc(fn, params);
    },

    async _rpc(fn, params) {
        const accessToken = this.auth.getAccessToken();
        const url = `${SUPABASE_URL}/rest/v1/rpc/${fn}`;

        const headers = {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY
        };

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`RPC ${fn} failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { data: result, error: null };
        } catch (error) {
            console.error('Supabase RPC error:', error);
            return { data: null, error };
        }
    }
};

// Database Tables Structure
const DB_TABLES = {
    SESSIONS: 'focus_sessions',
    TASKS: 'tasks',
    DISTRACTIONS: 'distractions',
    USER_PREFERENCES: 'user_preferences'
};

// Initialize Database
async function initDatabase() {
    const user = supabaseClient.auth.getUser();
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }

    // Check if tables exist for this user (simplified check)
    const { data: sessions } = await supabaseClient.from(DB_TABLES.SESSIONS).select('count');
    
    // Store user info
    localStorage.setItem('focusledger.user', JSON.stringify(user));
    
    return user;
}

// Session Management
const SessionManager = {
    async createSession(sessionData) {
        const { data, error } = await supabaseClient
            .from(DB_TABLES.SESSIONS)
            .insert([{
                user_id: supabaseClient.auth.getUser()?.id,
                start_time: new Date().toISOString(),
                duration: sessionData.duration,
                task_id: sessionData.taskId,
                distractions: sessionData.distractions,
                notes: sessionData.notes,
                focus_score: sessionData.focusScore
            }]);

        if (error) throw error;
        return data?.[0];
    },

    async getSessions(period = 'week') {
        const user = supabaseClient.auth.getUser();
        if (!user) return [];

        let startDate = new Date();
        switch (period) {
            case 'day':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            default:
                startDate.setDate(startDate.getDate() - 7);
        }

        const { data, error } = await supabaseClient
            .from(DB_TABLES.SESSIONS)
            .select('*, tasks(*)')
            .eq('user_id', user.id)
            .gte('start_time', startDate.toISOString())
            .order('start_time', { ascending: false });

        if (error) {
            console.error('Error fetching sessions:', error);
            return [];
        }

        return data || [];
    },

    async updateSession(sessionId, updates) {
        const { data, error } = await supabaseClient
            .from(DB_TABLES.SESSIONS)
            .update(updates)
            .eq('id', sessionId);

        if (error) throw error;
        return data;
    }
};

// Task Management
const TaskManager = {
    async createTask(taskData) {
        const user = supabaseClient.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabaseClient
            .from(DB_TABLES.TASKS)
            .insert([{
                user_id: user.id,
                title: taskData.title,
                project: taskData.project,
                description: taskData.description,
                status: 'active',
                estimated_duration: taskData.estimatedDuration
            }]);

        if (error) throw error;
        return data?.[0];
    },

    async getTasks(filters = {}) {
        const user = supabaseClient.auth.getUser();
        if (!user) return [];

        let query = supabaseClient
            .from(DB_TABLES.TASKS)
            .select('*')
            .eq('user_id', user.id);

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        if (filters.project) {
            query = query.eq('project', filters.project);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tasks:', error);
            return [];
        }

        return data || [];
    },

    async updateTask(taskId, updates) {
        const { data, error } = await supabaseClient
            .from(DB_TABLES.TASKS)
            .update(updates)
            .eq('id', taskId);

        if (error) throw error;
        return data;
    }
};

// Analytics
const AnalyticsManager = {
    async getFocusStats(period = 'week') {
        const sessions = await SessionManager.getSessions(period);
        
        const stats = {
            totalFocusTime: 0,
            averageSessionLength: 0,
            sessionsCount: sessions.length,
            focusEfficiency: 0,
            tasksCompleted: 0
        };

        if (sessions.length > 0) {
            stats.totalFocusTime = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
            stats.averageSessionLength = Math.round(stats.totalFocusTime / sessions.length);
            
            // Simple efficiency calculation (based on session length vs distractions)
            const efficientSessions = sessions.filter(s => {
                const distractions = s.distractions?.length || 0;
                return distractions <= 2; // 2 or fewer distractions considered efficient
            });
            stats.focusEfficiency = Math.round((efficientSessions.length / sessions.length) * 100);
        }

        return stats;
    },

    async getDailyPatterns(period = 'week') {
        const sessions = await SessionManager.getSessions(period);
        const patterns = {
            byDayOfWeek: {},
            byHour: {}
        };

        sessions.forEach(session => {
            const date = new Date(session.start_time);
            const day = date.toLocaleDateString('en-US', { weekday: 'short' });
            const hour = date.getHours();

            patterns.byDayOfWeek[day] = (patterns.byDayOfWeek[day] || 0) + (session.duration || 0);
            patterns.byHour[hour] = (patterns.byHour[hour] || 0) + (session.duration || 0);
        });

        return patterns;
    }
};

// Export for use in other files
window.supabase = supabaseClient;
window.SessionManager = SessionManager;
window.TaskManager = TaskManager;
window.AnalyticsManager = AnalyticsManager;
window.DB_TABLES = DB_TABLES;
window.initDatabase = initDatabase;