// 💖 減量ダッシュボード - データベース管理
class WeightDatabase {
    constructor() {
        this.dbName = 'WeightLossDashboard';
        this.version = 3; // Updated version for new schema
        this.db = null;
        this.init();
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('❌ データベースの初期化に失敗しました');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ データベースが正常に初期化されました');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log(`🔄 データベースを v${event.oldVersion} から v${event.newVersion} にアップグレード中...`);
                
                // Daily Log Store - カロリー・運動データ
                if (!db.objectStoreNames.contains('dailyLogs')) {
                    const dailyLogStore = db.createObjectStore('dailyLogs', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    // Indexes for efficient querying
                    dailyLogStore.createIndex('date', 'date', { unique: true }); // One entry per date
                    dailyLogStore.createIndex('timestamp', 'timestamp', { unique: false });
                    dailyLogStore.createIndex('calorieBalance', 'calorieBalance', { unique: false });
                    dailyLogStore.createIndex('fatLoss', 'fatLoss', { unique: false });
                    
                    console.log('📊 dailyLogs store created');
                }

                // Settings Store - 設定データ（BMR、活動係数等）
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', {
                        keyPath: 'key'
                    });
                    console.log('⚙️ settings store created');
                }

                // User Profile Store - ユーザー情報
                if (!db.objectStoreNames.contains('userProfile')) {
                    const userProfileStore = db.createObjectStore('userProfile', {
                        keyPath: 'id'
                    });
                    userProfileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    console.log('👤 userProfile store created');
                }

                // Analytics Store - 分析データ
                if (!db.objectStoreNames.contains('analytics')) {
                    const analyticsStore = db.createObjectStore('analytics', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    analyticsStore.createIndex('type', 'type', { unique: false });
                    analyticsStore.createIndex('date', 'date', { unique: false });
                    console.log('📈 analytics store created');
                }

                // Migrate old data if exists
                if (db.objectStoreNames.contains('dashboardData')) {
                    console.log('🔄 Migrating old dashboardData...');
                    // Migration will be handled in success callback
                }

                // Remove obsolete stores
                const obsoleteStores = ['weights', 'dashboardData'];
                obsoleteStores.forEach(storeName => {
                    if (db.objectStoreNames.contains(storeName)) {
                        db.deleteObjectStore(storeName);
                        console.log(`🗑️ Removed obsolete store: ${storeName}`);
                    }
                });
            };
        });
    }

    // === Daily Log Methods ===
    
    async addDailyLog(logData) {
        return new Promise((resolve, reject) => {
            if (!this.validateDailyLogData(logData)) {
                reject(new Error('Invalid daily log data'));
                return;
            }

            const transaction = this.db.transaction(['dailyLogs'], 'readwrite');
            const store = transaction.objectStore('dailyLogs');
            
            const dailyLogRecord = {
                date: logData.date,
                timestamp: logData.timestamp || Date.now(),
                
                // Calorie data
                caloriesIntake: parseFloat(logData.calories) || 0,
                caloriesBurned: parseFloat(logData.caloriesBurned) || 0,
                calorieBalance: parseFloat(logData.calorieBalance) || 0,
                
                // Exercise data
                walking: parseFloat(logData.walking) || 0,
                yoga: parseFloat(logData.yoga) || 0,
                exerciseCalories: parseFloat(logData.exerciseCalories) || 0,
                
                // Calculated results
                fatLoss: parseFloat(logData.fatLoss) || 0,
                tdee: parseFloat(logData.tdee) || 0,
                
                // Metadata
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Use put instead of add to allow updates for same date
            const request = store.put(dailyLogRecord);
            
            request.onsuccess = () => {
                console.log('📊 Daily log saved:', dailyLogRecord);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to save daily log');
                reject(request.error);
            };
        });
    }

    async getAllDailyLogs() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyLogs'], 'readonly');
            const store = transaction.objectStore('dailyLogs');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const logs = request.result.sort((a, b) => b.timestamp - a.timestamp);
                resolve(logs);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get daily logs');
                reject(request.error);
            };
        });
    }

    async getDailyLogByDate(date) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyLogs'], 'readonly');
            const store = transaction.objectStore('dailyLogs');
            const index = store.index('date');
            const request = index.get(date);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get daily log by date');
                reject(request.error);
            };
        });
    }

    async getDailyLogsByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyLogs'], 'readonly');
            const store = transaction.objectStore('dailyLogs');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const logs = request.result.filter(log => {
                    const logDate = new Date(log.date);
                    return logDate >= startDate && logDate <= endDate;
                }).sort((a, b) => a.timestamp - b.timestamp);
                resolve(logs);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get daily logs by date range');
                reject(request.error);
            };
        });
    }

    async deleteDailyLog(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['dailyLogs'], 'readwrite');
            const store = transaction.objectStore('dailyLogs');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                console.log('🗑️ Daily log deleted:', id);
                resolve();
            };
            
            request.onerror = () => {
                console.error('❌ Failed to delete daily log');
                reject(request.error);
            };
        });
    }

    // === Settings Methods ===
    
    async setSetting(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            
            const setting = {
                key: key,
                value: value,
                updatedAt: new Date().toISOString()
            };
            
            const request = store.put(setting);
            
            request.onsuccess = () => {
                console.log('⚙️ Setting saved:', key, value);
                resolve();
            };
            
            request.onerror = () => {
                console.error('❌ Failed to save setting');
                reject(request.error);
            };
        });
    }

    async getSetting(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : defaultValue);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get setting:', key);
                resolve(defaultValue);
            };
        });
    }

    async getAllSettings() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const settings = {};
                request.result.forEach(item => {
                    settings[item.key] = item.value;
                });
                resolve(settings);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get all settings');
                reject(request.error);
            };
        });
    }

    // === User Profile Methods ===
    
    async saveUserProfile(profileData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['userProfile'], 'readwrite');
            const store = transaction.objectStore('userProfile');
            
            const profile = {
                id: 'main',
                currentWeight: parseFloat(profileData.currentWeight) || 70.0,
                targetWeight: parseFloat(profileData.targetWeight) || 65.0,
                height: parseFloat(profileData.height) || 160.0,
                age: parseInt(profileData.age) || 25,
                gender: profileData.gender || 'other',
                activityLevel: profileData.activityLevel || 'moderate',
                
                // Calculated values
                bmr: parseFloat(profileData.bmr) || 1300,
                activityFactor: parseFloat(profileData.activityFactor) || 1.40,
                tdee: parseFloat(profileData.tdee) || 1820,
                
                // Goal settings
                goalStartDate: profileData.goalStartDate || new Date().toISOString().split('T')[0],
                goalEndDate: profileData.goalEndDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                weeklyGoal: parseFloat(profileData.weeklyGoal) || 0.5, // kg per week
                
                // Metadata
                createdAt: profileData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const request = store.put(profile);
            
            request.onsuccess = () => {
                console.log('👤 User profile saved:', profile);
                resolve(profile);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to save user profile');
                reject(request.error);
            };
        });
    }

    async getUserProfile() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['userProfile'], 'readonly');
            const store = transaction.objectStore('userProfile');
            const request = store.get('main');
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error('❌ Failed to get user profile');
                reject(request.error);
            };
        });
    }

    // === Analytics Methods ===
    
    async getDashboardStatistics() {
        try {
            const logs = await this.getAllDailyLogs();
            const profile = await this.getUserProfile();
            
            if (!logs || logs.length === 0) {
                return {
                    totalEntries: 0,
                    totalCalorieDeficit: 0,
                    totalFatLoss: 0,
                    averageCalorieBalance: 0,
                    totalExerciseCalories: 0,
                    averageWalking: 0,
                    averageYoga: 0,
                    currentStreak: 0,
                    weeklyAverage: {},
                    monthlyTrend: {}
                };
            }

            // Basic statistics
            const totalCalorieDeficit = logs.reduce((sum, log) => {
                return sum + Math.abs(Math.min(0, log.calorieBalance));
            }, 0);

            const totalFatLoss = logs.reduce((sum, log) => {
                return sum + (log.fatLoss || 0);
            }, 0);

            const totalExerciseCalories = logs.reduce((sum, log) => {
                return sum + (log.exerciseCalories || 0);
            }, 0);

            const averageCalorieBalance = logs.reduce((sum, log) => {
                return sum + log.calorieBalance;
            }, 0) / logs.length;

            const averageWalking = logs.reduce((sum, log) => {
                return sum + (log.walking || 0);
            }, 0) / logs.length;

            const averageYoga = logs.reduce((sum, log) => {
                return sum + (log.yoga || 0);
            }, 0) / logs.length;

            // Current streak calculation
            let currentStreak = 0;
            const today = new Date();
            const sortedLogs = logs.sort((a, b) => b.timestamp - a.timestamp);

            for (let i = 0; i < sortedLogs.length; i++) {
                const logDate = new Date(sortedLogs[i].date);
                const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
                
                if (daysDiff === i) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // Weekly averages (last 4 weeks)
            const weeklyAverage = await this.getWeeklyAverages();
            
            // Monthly trend
            const monthlyTrend = await this.getMonthlyTrend();

            return {
                totalEntries: logs.length,
                totalCalorieDeficit: Math.round(totalCalorieDeficit),
                totalFatLoss: Math.round(totalFatLoss * 1000) / 1000,
                averageCalorieBalance: Math.round(averageCalorieBalance),
                totalExerciseCalories: Math.round(totalExerciseCalories),
                averageWalking: Math.round(averageWalking * 10) / 10,
                averageYoga: Math.round(averageYoga * 10) / 10,
                currentStreak: currentStreak,
                weeklyAverage: weeklyAverage,
                monthlyTrend: monthlyTrend,
                estimatedWeightLoss: totalFatLoss,
                projectedGoalDate: await this.calculateProjectedGoalDate()
            };
        } catch (error) {
            console.error('❌ Failed to get dashboard statistics:', error);
            throw error;
        }
    }

    async getWeeklyAverages() {
        const logs = await this.getAllDailyLogs();
        const weeks = {};
        
        logs.forEach(log => {
            const logDate = new Date(log.date);
            const weekKey = this.getWeekKey(logDate);
            
            if (!weeks[weekKey]) {
                weeks[weekKey] = {
                    logs: [],
                    totalDeficit: 0,
                    totalExercise: 0,
                    totalFatLoss: 0
                };
            }
            
            weeks[weekKey].logs.push(log);
            weeks[weekKey].totalDeficit += Math.abs(Math.min(0, log.calorieBalance));
            weeks[weekKey].totalExercise += (log.walking || 0) + (log.yoga || 0);
            weeks[weekKey].totalFatLoss += log.fatLoss || 0;
        });

        // Calculate averages for each week
        Object.keys(weeks).forEach(week => {
            const weekData = weeks[week];
            const logCount = weekData.logs.length;
            
            weekData.avgDeficit = weekData.totalDeficit / logCount;
            weekData.avgExercise = weekData.totalExercise / logCount;
            weekData.avgFatLoss = weekData.totalFatLoss / logCount;
        });

        return weeks;
    }

    async getMonthlyTrend() {
        const logs = await this.getAllDailyLogs();
        const months = {};
        
        logs.forEach(log => {
            const logDate = new Date(log.date);
            const monthKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (!months[monthKey]) {
                months[monthKey] = {
                    totalDeficit: 0,
                    totalFatLoss: 0,
                    entries: 0
                };
            }
            
            months[monthKey].totalDeficit += Math.abs(Math.min(0, log.calorieBalance));
            months[monthKey].totalFatLoss += log.fatLoss || 0;
            months[monthKey].entries++;
        });

        return months;
    }

    async calculateProjectedGoalDate() {
        try {
            const profile = await this.getUserProfile();
            const recentLogs = (await this.getAllDailyLogs()).slice(0, 14); // Last 2 weeks
            
            if (!profile || !recentLogs.length) return null;

            const avgDeficitPerDay = recentLogs.reduce((sum, log) => {
                return sum + Math.abs(Math.min(0, log.calorieBalance));
            }, 0) / recentLogs.length;

            const remainingWeight = profile.currentWeight - profile.targetWeight;
            const remainingCalories = remainingWeight * 7200; // 7200 kcal per kg
            const daysToGoal = Math.ceil(remainingCalories / avgDeficitPerDay);

            const projectedDate = new Date();
            projectedDate.setDate(projectedDate.getDate() + daysToGoal);

            return projectedDate.toISOString().split('T')[0];
        } catch (error) {
            console.error('❌ Failed to calculate projected goal date:', error);
            return null;
        }
    }

    // === Utility Methods ===
    
    validateDailyLogData(data) {
        if (!data.date) {
            console.error('❌ Daily log validation failed: missing date');
            return false;
        }
        
        if (typeof data.calories !== 'number' || data.calories < 0) {
            console.error('❌ Daily log validation failed: invalid calories');
            return false;
        }

        return true;
    }

    getWeekKey(date) {
        const year = date.getFullYear();
        const weekNumber = Math.ceil(((date - new Date(year, 0, 1)) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    }

    // === Data Export/Import ===
    
    async exportData() {
        try {
            const [logs, settings, profile] = await Promise.all([
                this.getAllDailyLogs(),
                this.getAllSettings(),
                this.getUserProfile()
            ]);
            
            const exportData = {
                exportDate: new Date().toISOString(),
                version: this.version,
                dailyLogs: logs,
                settings: settings,
                userProfile: profile
            };

            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            console.error('❌ Export failed:', error);
            throw error;
        }
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Validate import data
            if (!data.version || !data.exportDate) {
                throw new Error('Invalid import data format');
            }

            const transaction = this.db.transaction(['dailyLogs', 'settings', 'userProfile'], 'readwrite');
            
            // Clear existing data
            await Promise.all([
                this.clearStore('dailyLogs'),
                this.clearStore('settings'),
                this.clearStore('userProfile')
            ]);

            // Import daily logs
            if (data.dailyLogs) {
                const logStore = transaction.objectStore('dailyLogs');
                for (const log of data.dailyLogs) {
                    await this.putRecord(logStore, log);
                }
            }

            // Import settings
            if (data.settings) {
                for (const [key, value] of Object.entries(data.settings)) {
                    await this.setSetting(key, value);
                }
            }

            // Import user profile
            if (data.userProfile) {
                await this.saveUserProfile(data.userProfile);
            }

            console.log('✅ Data import completed successfully');
            return true;
        } catch (error) {
            console.error('❌ Import failed:', error);
            return false;
        }
    }

    async clearStore(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async putRecord(store, record) {
        return new Promise((resolve, reject) => {
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // === Legacy Support (for backward compatibility) ===
    
    async addWeightData(dataEntry) {
        console.log('⚠️ addWeightData is deprecated, use addDailyLog instead');
        return this.addDailyLog({
            date: dataEntry.date,
            timestamp: dataEntry.timestamp,
            calories: dataEntry.calories,
            walking: dataEntry.walking,
            yoga: dataEntry.yoga,
            calorieBalance: dataEntry.calorieBalance,
            fatLoss: dataEntry.fatLoss,
            exerciseCalories: dataEntry.exerciseCalories
        });
    }

    async getAllWeightData() {
        console.log('⚠️ getAllWeightData is deprecated, use getAllDailyLogs instead');
        return this.getAllDailyLogs();
    }

    // === Database Maintenance ===
    
    async vacuum() {
        // IndexedDB doesn't support vacuum, but we can clean up old data
        try {
            const logs = await this.getAllDailyLogs();
            const cutoffDate = new Date();
            cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); // Keep 1 year of data
            
            const oldLogs = logs.filter(log => new Date(log.date) < cutoffDate);
            
            for (const log of oldLogs) {
                await this.deleteDailyLog(log.id);
            }
            
            console.log(`🧹 Cleaned up ${oldLogs.length} old records`);
            return oldLogs.length;
        } catch (error) {
            console.error('❌ Vacuum failed:', error);
            throw error;
        }
    }

    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    available: estimate.quota || 0,
                    percentage: estimate.usage && estimate.quota 
                        ? Math.round((estimate.usage / estimate.quota) * 100) 
                        : 0
                };
            } catch (error) {
                console.error('❌ Failed to get storage usage:', error);
                return null;
            }
        }
        return null;
    }
}

// Initialize and make globally available
window.weightDB = new WeightDatabase();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeightDatabase;
}