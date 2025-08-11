import { useState, useEffect, useMemo } from 'react'
import { Settings, Heart, Sparkles, X } from 'lucide-react'
import { Button } from './components/ui/button'
import { Card, CardContent, CardTitle } from './components/ui/card'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { motion } from 'framer-motion'
import motivationMessages from './motivation.json'
import { type Settings as SettingsType, type Logs, type DailyLog, loadSettings, saveSettings, loadLogs, saveLogs, deriveChartData, formatDateToYMD, clamp } from './lib/utils'

const MOCK = [
  { date: "8/21", intake: 1400, tdee: 1850, deficit: -450, cumDef: 450, fat: 0.06 },
  { date: "8/22", intake: 1320, tdee: 1900, deficit: -580, cumDef: 1030, fat: 0.14 },
  { date: "8/23", intake: 1500, tdee: 1820, deficit: -320, cumDef: 1350, fat: 0.19 },
  { date: "8/24", intake: 1600, tdee: 1750, deficit: -150, cumDef: 1500, fat: 0.21 },
  { date: "8/25", intake: 1280, tdee: 1900, deficit: -620, cumDef: 2120, fat: 0.29 },
  { date: "8/26", intake: 1380, tdee: 1860, deficit: -480, cumDef: 2600, fat: 0.36 },
  { date: "8/27", intake: 1450, tdee: 1820, deficit: -370, cumDef: 2970, fat: 0.41 }
]

function App() {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYMD(new Date()))
  const [todayIntake, setTodayIntake] = useState<number>(0)
  const [todayWalk, setTodayWalk] = useState<number>(0)
  const [todayYoga, setTodayYoga] = useState<number>(0)
  const [todayRingfit, setTodayRingfit] = useState<number>(0)
  const [todayOther, setTodayOther] = useState<number>(0)
  const [motivationText, setMotivationText] = useState<string>("")
  const [showToast, setShowToast] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<SettingsType>(() => loadSettings())
  const [logs, setLogs] = useState<Logs>(() => loadLogs())
  const [tempSettings, setTempSettings] = useState<SettingsType>(settings)

  const chartData = useMemo(() => {
    const hasData = Object.keys(logs).length > 0;
    if (!hasData) {
      return MOCK;
    }
    return deriveChartData(logs, settings);
  }, [logs, settings]);
  
  const cumDefKcal = chartData.length > 0 ? (chartData[chartData.length - 1].cumDef ?? 0) : 0
  const roundedCumDefKcal = Math.round(cumDefKcal)
  const cumFat = cumDefKcal / 7200
  const progress = clamp(Math.round((cumFat / 3.0) * 100), 0, 100)
  
  const selectedLog = logs[selectedDate]
  const todayDeficit = selectedLog ? {
    w: settings.startWeightKg,
    exerciseKcal: (selectedLog.exercises || []).reduce((sum, ex) => sum + ex.mets * 3.5 * settings.startWeightKg / 200 * ex.minutes, 0),
    get deficit() { return selectedLog.intakeKcal - (settings.bmr * settings.activityFactor + this.exerciseKcal); }
  }.deficit : 0
  const todayFatLoss = Math.max(0, -todayDeficit) / 7200

  useEffect(() => {
    const randomMessage = motivationMessages[Math.floor(Math.random() * motivationMessages.length)]
    setMotivationText(randomMessage)
    
    const log = logs[selectedDate]
    if (log) {
      setTodayIntake(log.intakeKcal)
      const walk = log.exercises?.find(ex => ex.name === "ウォーキング")
      const yoga = log.exercises?.find(ex => ex.name === "ヨガ")
      const ringfit = log.exercises?.find(ex => ex.name === "リングフィット")
      const other = log.exercises?.find(ex => ex.name === "その他")
      setTodayWalk(walk?.minutes ?? 0)
      setTodayYoga(yoga?.minutes ?? 0)
      setTodayRingfit(ringfit?.minutes ?? 0)
      setTodayOther(other?.minutes ?? 0)
    } else {
      setTodayIntake(0)
      setTodayWalk(0)
      setTodayYoga(0)
      setTodayRingfit(0)
      setTodayOther(0)
    }
  }, [selectedDate, logs])
  
  const handleSettingsOpen = () => {
    setTempSettings(settings)
    setShowSettings(true)
  }
  
  const handleSettingsSave = () => {
    setSettings(tempSettings)
    saveSettings(tempSettings)
    setShowSettings(false)
  }
  
  const handleSettingsCancel = () => {
    setTempSettings(settings)
    setShowSettings(false)
  }
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSettings) {
        handleSettingsCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showSettings])

  const handleSave = () => {
    const newLog: DailyLog = {
      intakeKcal: Math.max(0, todayIntake || 0),
      exercises: [
        { name: "ウォーキング", minutes: Math.max(0, todayWalk || 0), mets: 3.5 },
        { name: "ヨガ", minutes: Math.max(0, todayYoga || 0), mets: 2.5 },
        { name: "リングフィット", minutes: Math.max(0, todayRingfit || 0), mets: 4.0 },
        { name: "その他", minutes: Math.max(0, todayOther || 0), mets: 3.0 }
      ].filter(ex => ex.minutes > 0)
    }
    
    const newLogs = { ...logs, [selectedDate]: newLog }
    setLogs(newLogs)
    saveLogs(newLogs)
    
    setShowToast(true)
    setTimeout(() => setShowToast(false), 1500)
    
    const randomMessage = motivationMessages[Math.floor(Math.random() * motivationMessages.length)]
    setMotivationText(randomMessage)
  }


  const gradientId = 'fat-gradient'

  return (
    <div className="min-h-screen w-full max-w-md mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
          💖
        </div>
        <h1 className="text-lg font-semibold">まっちゃん痩せるもん</h1>
        <Button variant="ghost" size="icon" onClick={handleSettingsOpen}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* 目標・進捗 Card */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{settings.startWeightKg.toFixed(1)} → {settings.targetWeightKg.toFixed(1)} kg</span>
            <span className="text-sm text-gray-500">{settings.startDate.replace(/^\d{4}-/, '').replace(/-/, '/')}〜{settings.endDate.replace(/^\d{4}-/, '').replace(/-/, '/')}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span className="text-sm">達成率</span>
            </div>
            <span className="text-sm font-bold">{progress}%</span>
          </div>
          <div className="progress-container">
            <motion.div 
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
          <div className="text-xs text-gray-600">
            累計推定脂肪減少 {cumFat.toFixed(2)} kg / {(settings.startWeightKg - settings.targetWeightKg).toFixed(2)} kg
          </div>
        </CardContent>
      </Card>

      {/* 今日の入力 ✍️ */}
      <div>
        <Card>
          <CardContent className="space-y-4">
            <CardTitle className="text-sm">今日の入力 ✍️</CardTitle>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">日付</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border input-pink focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">摂取カロリー (kcal)</label>
                <input
                  type="number"
                  value={todayIntake || ''}
                  onChange={(e) => setTodayIntake(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border input-pink focus:outline-none focus:ring-2 focus:ring-pink-400"
                  placeholder="1500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">ウォーキング (分)</label>
                  <input
                    type="number"
                    value={todayWalk || ''}
                    onChange={(e) => setTodayWalk(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border input-rose focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">ヨガ (分)</label>
                  <input
                    type="number"
                    value={todayYoga || ''}
                    onChange={(e) => setTodayYoga(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border input-violet focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="15"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">リングフィット (分)</label>
                  <input
                    type="number"
                    value={todayRingfit || ''}
                    onChange={(e) => setTodayRingfit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border input-pink focus:outline-none focus:ring-2 focus:ring-pink-400"
                    placeholder="20"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">その他 (分)</label>
                  <input
                    type="number"
                    value={todayOther || ''}
                    onChange={(e) => setTodayOther(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border input-rose focus:outline-none focus:ring-2 focus:ring-rose-400"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                保存する
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 今日の結果 📉 */}
      <div>
        <Card>
          <CardContent className="space-y-4">
            <CardTitle className="text-sm">今日の結果 📉</CardTitle>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center space-y-1">
                <div className="text-sm text-gray-600">推定脂肪減少</div>
                <div className="text-2xl font-extrabold">{todayFatLoss.toFixed(2)} kg</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-sm text-gray-600">今日の収支</div>
                <div className="text-2xl font-extrabold text-rose-500">{todayDeficit.toFixed(0)} kcal</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 累計 🧮 */}
      <div>
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="text-center space-y-1 py-4">
              <div className="text-sm text-gray-600">累計カロリー赤字</div>
              <div className="text-2xl font-extrabold">{roundedCumDefKcal.toLocaleString()} kcal</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="text-center space-y-1 py-4">
              <div className="text-sm text-gray-600">累計推定脂肪減少</div>
              <div className="text-2xl font-extrabold">{cumFat.toFixed(2)} kg</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* グラフ 🐻‍❄️ */}
      <div className="space-y-4">
        <Card>
          <CardContent className="py-4">
            <CardTitle className="text-sm mb-3">日別カロリー収支（摂取−消費）</CardTitle>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Bar dataKey="deficit" fill="var(--accent-strong)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <CardTitle className="text-sm mb-3">累計カロリー赤字</CardTitle>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="cumDef"
                  stroke="var(--accent-mid)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <CardTitle className="text-sm mb-3">推定脂肪減少の推移</CardTitle>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f472b6" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#f472b6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${Math.round(v * 1000)} g`} />
                <Tooltip
                  formatter={(value: any) => [`${Math.round(Number(value) * 1000)} g`, "脂肪減少"]}
                  labelFormatter={(label: any) => `日付: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="fat"
                  stroke="#f472b6"
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* モチベーション */}
      <div>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <span className="text-2xl">🌈</span>
            <span className="text-sm flex-1">{motivationText}</span>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="text-center py-4">
        <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
          <Heart className="w-3 h-3" />
          <span>推定値であり医療的助言ではありません</span>
        </div>
      </footer>

      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>
        保存しました 💖
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && handleSettingsCancel()}>
          <div className="modal-content">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">設定</CardTitle>
                  <Button variant="ghost" size="icon" onClick={handleSettingsCancel}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">基礎代謝率 (kcal)</label>
                    <input
                      type="number"
                      min="0"
                      value={tempSettings.bmr}
                      onChange={(e) => setTempSettings({...tempSettings, bmr: Math.max(0, Number(e.target.value) || 0)})}
                      className="w-full px-3 py-2 rounded-lg border input-pink focus:outline-none focus:ring-2 focus:ring-pink-400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">活動係数</label>
                    <input
                      type="number"
                      min="1"
                      max="3"
                      step="0.01"
                      value={tempSettings.activityFactor}
                      onChange={(e) => setTempSettings({...tempSettings, activityFactor: Math.max(1, Number(e.target.value) || 1)})}
                      className="w-full px-3 py-2 rounded-lg border input-rose focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">開始体重 (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={tempSettings.startWeightKg}
                        onChange={(e) => setTempSettings({...tempSettings, startWeightKg: Math.max(0, Number(e.target.value) || 0)})}
                        className="w-full px-3 py-2 rounded-lg border input-violet focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">目標体重 (kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={tempSettings.targetWeightKg}
                        onChange={(e) => setTempSettings({...tempSettings, targetWeightKg: Math.max(0, Number(e.target.value) || 0)})}
                        className="w-full px-3 py-2 rounded-lg border input-pink focus:outline-none focus:ring-2 focus:ring-pink-400"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">開始日</label>
                      <input
                        type="date"
                        value={tempSettings.startDate}
                        onChange={(e) => setTempSettings({...tempSettings, startDate: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border input-rose focus:outline-none focus:ring-2 focus:ring-rose-400"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">終了日</label>
                      <input
                        type="date"
                        value={tempSettings.endDate}
                        onChange={(e) => setTempSettings({...tempSettings, endDate: e.target.value})}
                        className="w-full px-3 py-2 rounded-lg border input-violet focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSettingsSave} className="flex-1">
                    保存
                  </Button>
                  <Button variant="outline" onClick={handleSettingsCancel} className="flex-1">
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default App