// 💖 減量ダッシュボード - メインアプリケーション
class WeightLossApp {
    constructor() {
        this.motivationMessages = [];
        this.charts = {
            daily: null,
            cumulative: null,
            fatLoss: null
        };
        this.settings = {
            currentWeight: 71.0,
            targetWeight: 68.0,
            startDate: '2024-08-20',
            endDate: '2024-09-30',
            BMR: 1300,
            activityFactor: 1.40
        };
        this.metsData = {
            walking: 3.3,
            yoga: 2.5
        };
        this.currentResults = {
            fatLoss: 0,
            calorieBalance: 0,
            totalExerciseCalories: 0
        };
        this.init();
    }

    async init() {
        console.log('🚀 WeightLossApp initializing...');
        try {
            await this.waitForDB();
            await this.loadMotivationMessages();
            await this.initializeServiceWorker();
            await this.loadSettings();
            this.setupEventListeners();
            await this.loadData();
            this.updateMotivationMessage();
            await this.initializeCharts();
            this.startProgressAnimation();
            console.log('✅ WeightLossApp initialized successfully');
        } catch (error) {
            console.error('❌ WeightLossApp initialization failed:', error);
            this.showToast('アプリの初期化に失敗しました', 'error');
        }
    }

    async waitForDB() {
        let attempts = 0;
        while (!window.weightDB || !window.weightDB.db) {
            if (attempts > 50) throw new Error('Database initialization timeout');
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        console.log('📊 Database ready');
    }

    async initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./service-worker.js');
                console.log('🔧 Service Worker registered successfully');
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        }
    }

    async loadMotivationMessages() {
        try {
            const response = await fetch('./motivation.json');
            const data = await response.json();
            this.motivationMessages = data.messages;
            console.log(`💖 Loaded ${this.motivationMessages.length} motivation messages`);
        } catch (error) {
            console.error('❌ Failed to load motivation messages:', error);
            this.motivationMessages = [
                { message: "今日も頑張りましょう！ 💪", condition: "default" },
                { message: "素晴らしい進歩です！ ✨", condition: "progress" },
                { message: "目標まであと少し！ 🎯", condition: "near_goal" },
                { message: "継続は力なり！ 🌟", condition: "consistency" }
            ];
        }
    }

    async loadSettings() {
        try {
            const savedSettings = await weightDB.getSetting('dashboardSettings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...savedSettings };
                console.log('⚙️ Settings loaded from database');
            }
            this.updateProgressDisplay();
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }

    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        // Main buttons
        const saveDataBtn = document.getElementById('save-data-btn');
        const settingsBtn = document.getElementById('settings-btn');
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        
        // Modal elements
        const modal = document.getElementById('settings-modal');
        const closeModal = document.querySelector('.close');

        // Input fields for real-time calculation
        const calorieInput = document.getElementById('calorie-input');
        const walkingInput = document.getElementById('walking-input');
        const yogaInput = document.getElementById('yoga-input');

        // Event listeners
        if (saveDataBtn) {
            saveDataBtn.addEventListener('click', () => this.saveData());
        }
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        // Real-time calculation on input
        [calorieInput, walkingInput, yogaInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => this.calculateAndDisplayResults());
                input.addEventListener('focus', () => this.highlightRelatedResults());
                input.addEventListener('blur', () => this.removeHighlight());
            }
        });

        // Modal events
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                if (modal) modal.style.display = 'none';
            });
        }

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'block') {
                modal.style.display = 'none';
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveData();
            }
        });

        console.log('✅ Event listeners set up successfully');
    }

    calculateMETs(minutes, activity) {
        const mets = this.metsData[activity] || 1.0;
        // METs × 3.5 × 体重(kg) / 200 × 時間(分)
        const caloriesBurned = (mets * 3.5 * this.settings.currentWeight / 200) * minutes;
        return Math.round(caloriesBurned * 10) / 10;
    }

    calculateTDEE() {
        return Math.round(this.settings.BMR * this.settings.activityFactor);
    }

    calculateFatLoss(calorieDeficit) {
        // 1kg脂肪 = 7200kcal
        return Math.max(0, calorieDeficit / 7200);
    }

    calculateAndDisplayResults() {
        const calories = parseFloat(document.getElementById('calorie-input').value) || 0;
        const walking = parseFloat(document.getElementById('walking-input').value) || 0;
        const yoga = parseFloat(document.getElementById('yoga-input').value) || 0;

        // TDEE calculation
        const tdee = this.calculateTDEE();

        // Exercise calories calculation
        const walkingCalories = this.calculateMETs(walking, 'walking');
        const yogaCalories = this.calculateMETs(yoga, 'yoga');
        const totalExerciseCalories = walkingCalories + yogaCalories;

        // Total calories burned
        const totalBurnedCalories = tdee + totalExerciseCalories;

        // Calorie balance
        const calorieBalance = calories - totalBurnedCalories;

        // Fat loss estimation (only for deficit)
        const fatLoss = this.calculateFatLoss(Math.abs(Math.min(0, calorieBalance)));

        // Store current results
        this.currentResults = {
            fatLoss: fatLoss,
            calorieBalance: calorieBalance,
            totalExerciseCalories: totalExerciseCalories
        };

        // Update display
        this.updateResultsDisplay();

        console.log('🧮 Calculations updated:', {
            calories,
            walking,
            yoga,
            tdee,
            totalExerciseCalories,
            calorieBalance,
            fatLoss
        });
    }

    updateResultsDisplay() {
        const fatLossElement = document.getElementById('fat-loss');
        const calorieBalanceElement = document.getElementById('calorie-balance');

        if (fatLossElement) {
            fatLossElement.textContent = `${this.currentResults.fatLoss.toFixed(3)} kg`;
            fatLossElement.style.color = this.currentResults.fatLoss > 0 ? '#10B981' : '#6B7280';
        }

        if (calorieBalanceElement) {
            const balance = this.currentResults.calorieBalance;
            const sign = balance >= 0 ? '+' : '';
            calorieBalanceElement.textContent = `${sign}${Math.round(balance)} kcal`;
            calorieBalanceElement.style.color = balance < 0 ? '#10B981' : '#EF4444';
        }
    }

    highlightRelatedResults() {
        const resultItems = document.querySelectorAll('.result-item, .cumulative-item');
        resultItems.forEach(item => {
            item.style.transform = 'scale(1.02)';
            item.style.boxShadow = '0 8px 25px rgba(255, 105, 180, 0.3)';
        });
    }

    removeHighlight() {
        const resultItems = document.querySelectorAll('.result-item, .cumulative-item');
        resultItems.forEach(item => {
            item.style.transform = '';
            item.style.boxShadow = '';
        });
    }

    async saveData() {
        const calorieInput = document.getElementById('calorie-input');
        const walkingInput = document.getElementById('walking-input');
        const yogaInput = document.getElementById('yoga-input');

        const calories = parseFloat(calorieInput.value);
        const walking = parseFloat(walkingInput.value) || 0;
        const yoga = parseFloat(yogaInput.value) || 0;

        if (!calories || calories <= 0) {
            this.showToast('摂取カロリーを入力してください 🍽️', 'warning');
            calorieInput.focus();
            return;
        }

        try {
            // Ensure calculations are up to date
            this.calculateAndDisplayResults();

            const dataEntry = {
                date: new Date().toISOString().split('T')[0],
                timestamp: Date.now(),
                calories: calories,
                walking: walking,
                yoga: yoga,
                calorieBalance: this.currentResults.calorieBalance,
                fatLoss: this.currentResults.fatLoss,
                exerciseCalories: this.currentResults.totalExerciseCalories
            };

            await weightDB.addWeightData(dataEntry);
            
            // Clear input fields with animation
            [calorieInput, walkingInput, yogaInput].forEach(input => {
                input.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    input.value = '';
                    input.style.transform = '';
                }, 150);
            });

            // Reset results display
            this.currentResults = { fatLoss: 0, calorieBalance: 0, totalExerciseCalories: 0 };
            this.updateResultsDisplay();

            // Reload data and update displays
            await this.loadData();
            
            // Success feedback
            this.showConfetti();
            this.showToast('データを保存しました！ ✨', 'success');
            this.updateMotivationMessage();
            
            console.log('💾 Data saved successfully:', dataEntry);
        } catch (error) {
            console.error('❌ Data save error:', error);
            this.showToast('保存に失敗しました 😢', 'error');
        }
    }

    async loadData() {
        try {
            const data = await weightDB.getAllWeightData();
            this.updateCumulativeStats(data);
            this.updateHistory(data);
            await this.updateCharts(data);
            console.log(`📈 Loaded ${data.length} data entries`);
        } catch (error) {
            console.error('❌ Data load error:', error);
            this.showToast('データの読み込みに失敗しました', 'error');
        }
    }

    updateCumulativeStats(data) {
        if (!data || data.length === 0) {
            document.getElementById('total-deficit').textContent = '0 kcal';
            document.getElementById('total-fat-loss').textContent = '0.000 kg';
            return;
        }

        const totalDeficit = data.reduce((sum, entry) => {
            return sum + Math.abs(Math.min(0, entry.calorieBalance));
        }, 0);

        const totalFatLoss = data.reduce((sum, entry) => {
            return sum + (entry.fatLoss || 0);
        }, 0);

        document.getElementById('total-deficit').textContent = `${Math.round(totalDeficit)} kcal`;
        document.getElementById('total-fat-loss').textContent = `${totalFatLoss.toFixed(3)} kg`;

        // Animate the numbers
        this.animateNumber('total-deficit', Math.round(totalDeficit));
        this.animateNumber('total-fat-loss', totalFatLoss, 3);
    }

    animateNumber(elementId, targetValue, decimals = 0) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const duration = 1000;
        const start = performance.now();
        const startValue = 0;

        const animate = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * easeOut;
            
            if (decimals === 0) {
                element.textContent = `${Math.round(currentValue)} kcal`;
            } else {
                element.textContent = `${currentValue.toFixed(decimals)} kg`;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    updateHistory(data) {
        const historyEl = document.getElementById('data-history');
        
        if (!data || data.length === 0) {
            historyEl.innerHTML = '<div class="no-data">まだ記録がありません 📝</div>';
            return;
        }

        const recentData = data.slice(0, 10);
        const historyItems = recentData.map((entry, index) => {
            const date = new Date(entry.date).toLocaleDateString('ja-JP');
            const balanceClass = entry.calorieBalance < 0 ? 'text-green-600' : 'text-red-500';
            const balanceText = `${entry.calorieBalance >= 0 ? '+' : ''}${Math.round(entry.calorieBalance)}`;
            
            return `
                <div class="history-item" style="animation-delay: ${index * 0.1}s">
                    <div><strong>📅 ${date}</strong></div>
                    <div>🍽️ ${entry.calories}kcal</div>
                    <div>🚶 ${entry.walking}分 🧘 ${entry.yoga}分</div>
                    <div class="${balanceClass}" style="font-weight: 600;">${balanceText}kcal</div>
                </div>
            `;
        }).join('');

        historyEl.innerHTML = historyItems;
    }

    async initializeCharts() {
        try {
            console.log('📊 Initializing charts...');
            
            // Wait for Chart.js to be available
            if (typeof Chart === 'undefined') {
                console.warn('⚠️ Chart.js not loaded, waiting...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Chart.js global configuration
            Chart.defaults.font.family = "'Hiragino Sans', 'Yu Gothic', 'Meiryo', sans-serif";
            Chart.defaults.font.size = 12;
            Chart.defaults.color = '#4A4A4A';

            await this.initDailyChart();
            await this.initCumulativeChart();
            await this.initFatLossChart();
            
            console.log('✅ All charts initialized successfully');
        } catch (error) {
            console.error('❌ Chart initialization failed:', error);
            this.showToast('グラフの初期化に失敗しました', 'error');
        }
    }

    async initDailyChart() {
        const canvas = document.getElementById('daily-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'カロリー収支',
                    data: [],
                    backgroundColor: (context) => {
                        const value = context.parsed.y;
                        return value < 0 
                            ? 'rgba(16, 185, 129, 0.8)'  // Green for deficit
                            : 'rgba(239, 68, 68, 0.8)';  // Red for surplus
                    },
                    borderColor: (context) => {
                        const value = context.parsed.y;
                        return value < 0 
                            ? '#10B981' 
                            : '#EF4444';
                    },
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#4A4A4A',
                        bodyColor: '#4A4A4A',
                        borderColor: '#FF69B4',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                const status = value < 0 ? '赤字 (良い!)' : '黒字 (注意)';
                                return `${value}kcal (${status})`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.3)',
                            lineWidth: 1
                        },
                        ticks: {
                            callback: (value) => `${value}kcal`
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.3)',
                            lineWidth: 1
                        }
                    }
                },
                animation: {
                    duration: 1500,
                    easing: 'easeOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    async initCumulativeChart() {
        const canvas = document.getElementById('cumulative-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.cumulative = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '累計カロリー赤字',
                    data: [],
                    borderColor: '#FF69B4',
                    backgroundColor: 'rgba(255, 105, 180, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#FF69B4',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#4A4A4A',
                        bodyColor: '#4A4A4A',
                        borderColor: '#FF69B4',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: (context) => `累計赤字: ${context.parsed.y.toLocaleString()}kcal`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.3)'
                        },
                        ticks: {
                            callback: (value) => `${(value / 1000).toFixed(1)}k`
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.3)'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    async initFatLossChart() {
        const canvas = document.getElementById('fat-loss-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts.fatLoss = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: '累計脂肪減少推定',
                    data: [],
                    borderColor: '#9333ea',
                    backgroundColor: 'rgba(147, 51, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#9333ea',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        titleColor: '#4A4A4A',
                        bodyColor: '#4A4A4A',
                        borderColor: '#9333ea',
                        borderWidth: 1,
                        cornerRadius: 12,
                        callbacks: {
                            label: (context) => `累計脂肪減少: ${context.parsed.y.toFixed(3)}kg`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.3)'
                        },
                        ticks: {
                            callback: (value) => `${value.toFixed(2)}kg`
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.3)'
                        }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }

    async updateCharts(data) {
        if (!data || data.length === 0) return;

        try {
            const recent30Days = data.slice(0, 30).reverse();
            const labels = recent30Days.map(entry => {
                const date = new Date(entry.date);
                return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
            });

            // Update daily chart
            if (this.charts.daily) {
                this.charts.daily.data.labels = labels;
                this.charts.daily.data.datasets[0].data = recent30Days.map(entry => entry.calorieBalance);
                this.charts.daily.update('active');
            }

            // Calculate cumulative data
            let cumulativeDeficit = 0;
            let cumulativeFatLoss = 0;
            const cumulativeDeficitData = [];
            const cumulativeFatLossData = [];

            recent30Days.forEach(entry => {
                cumulativeDeficit += Math.abs(Math.min(0, entry.calorieBalance));
                cumulativeFatLoss += entry.fatLoss || 0;
                cumulativeDeficitData.push(cumulativeDeficit);
                cumulativeFatLossData.push(cumulativeFatLoss);
            });

            // Update cumulative chart
            if (this.charts.cumulative) {
                this.charts.cumulative.data.labels = labels;
                this.charts.cumulative.data.datasets[0].data = cumulativeDeficitData;
                this.charts.cumulative.update('active');
            }

            // Update fat loss chart
            if (this.charts.fatLoss) {
                this.charts.fatLoss.data.labels = labels;
                this.charts.fatLoss.data.datasets[0].data = cumulativeFatLossData;
                this.charts.fatLoss.update('active');
            }

            console.log('📊 Charts updated with latest data');
        } catch (error) {
            console.error('❌ Chart update failed:', error);
        }
    }

    updateProgressDisplay() {
        const weightRange = document.querySelector('.weight-range');
        const period = document.querySelector('.period');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        if (weightRange) {
            weightRange.textContent = `${this.settings.currentWeight} → ${this.settings.targetWeight} kg`;
        }

        if (period) {
            const startDate = new Date(this.settings.startDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
            const endDate = new Date(this.settings.endDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
            period.textContent = `${startDate}〜${endDate}`;
        }

        // Progress calculation based on dates
        const now = new Date();
        const start = new Date(this.settings.startDate);
        const end = new Date(this.settings.endDate);
        
        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const passedDays = Math.ceil((now - start) / (1000 * 60 * 60 * 24));
        const progressPercent = Math.min(100, Math.max(0, (passedDays / totalDays) * 100));

        if (progressFill) {
            // Animate progress bar
            setTimeout(() => {
                progressFill.style.width = `${progressPercent}%`;
            }, 500);
        }
        if (progressText) {
            progressText.textContent = `${Math.round(progressPercent)}%`;
        }
    }

    startProgressAnimation() {
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
            this.updateProgressDisplay();
        }
    }

    openSettings() {
        const modal = document.getElementById('settings-modal');
        
        // Set current values
        document.getElementById('current-weight-setting').value = this.settings.currentWeight;
        document.getElementById('target-weight-setting').value = this.settings.targetWeight;
        document.getElementById('start-date-setting').value = this.settings.startDate;
        document.getElementById('end-date-setting').value = this.settings.endDate;
        
        if (modal) {
            modal.style.display = 'block';
            modal.querySelector('.modal-content').style.animation = 'modalAppear 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        }
    }

    async saveSettings() {
        const currentWeight = parseFloat(document.getElementById('current-weight-setting').value);
        const targetWeight = parseFloat(document.getElementById('target-weight-setting').value);
        const startDate = document.getElementById('start-date-setting').value;
        const endDate = document.getElementById('end-date-setting').value;

        if (!currentWeight || !targetWeight || !startDate || !endDate) {
            this.showToast('すべての項目を入力してください ⚙️', 'warning');
            return;
        }

        if (currentWeight <= 0 || targetWeight <= 0) {
            this.showToast('体重は正の数で入力してください', 'error');
            return;
        }

        if (new Date(startDate) >= new Date(endDate)) {
            this.showToast('終了日は開始日より後に設定してください', 'error');
            return;
        }

        this.settings.currentWeight = currentWeight;
        this.settings.targetWeight = targetWeight;
        this.settings.startDate = startDate;
        this.settings.endDate = endDate;

        try {
            await weightDB.setSetting('dashboardSettings', this.settings);
            this.updateProgressDisplay();
            document.getElementById('settings-modal').style.display = 'none';
            this.showToast('設定を保存しました！ ⚙️', 'success');
            
            // Recalculate current results with new weight
            this.calculateAndDisplayResults();
            
            console.log('⚙️ Settings saved:', this.settings);
        } catch (error) {
            console.error('❌ Settings save failed:', error);
            this.showToast('設定の保存に失敗しました', 'error');
        }
    }

    updateMotivationMessage() {
        const messageEl = document.getElementById('motivation-message');
        if (!messageEl || this.motivationMessages.length === 0) return;
        
        const randomMessage = this.motivationMessages[
            Math.floor(Math.random() * this.motivationMessages.length)
        ];
        
        // Animate message change
        messageEl.style.opacity = '0';
        setTimeout(() => {
            messageEl.textContent = randomMessage.message;
            messageEl.style.opacity = '1';
        }, 200);
    }

    showConfetti() {
        if (typeof confetti !== 'undefined') {
            // Multiple bursts for more impact
            const colors = ['#FF69B4', '#FFB6C1', '#9333ea', '#10B981', '#F59E0B'];
            
            // Burst 1
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6, x: 0.5 },
                colors: colors,
                gravity: 0.8,
                drift: 0,
                ticks: 300
            });

            // Burst 2 (delayed)
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    spread: 100,
                    origin: { y: 0.4, x: 0.3 },
                    colors: colors
                });
            }, 200);

            // Burst 3 (delayed)
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    spread: 100,
                    origin: { y: 0.4, x: 0.7 },
                    colors: colors
                });
            }, 400);

            console.log('🎉 Confetti animation triggered');
        } else {
            console.warn('⚠️ Confetti library not available');
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('⚠️ Toast element not found');
            return;
        }

        // Clear existing classes
        toast.className = 'toast';
        
        // Set content and type
        toast.textContent = message;
        toast.classList.add(type);

        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Hide toast
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);

        console.log(`🍞 Toast: ${type} - ${message}`);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM loaded, initializing WeightLossApp...');
    
    // Small delay to ensure all resources are loaded
    setTimeout(() => {
        try {
            window.app = new WeightLossApp();
        } catch (error) {
            console.error('❌ Failed to initialize WeightLossApp:', error);
        }
    }, 100);
});