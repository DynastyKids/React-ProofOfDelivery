import { useEffect, useState } from 'react'

const COOKIE_NAME = 'pod-language'
const languages = ['en', 'zh-CN', 'zh-TW']
const translations = {
  en: { language: 'Language', english: 'English', simplified: '简体中文', traditional: '繁體中文', logout: 'Log out', online: 'Online', offline: 'Offline', sync: 'Sync', driver: 'Driver', administrator: 'Administrator', welcome: 'Welcome back.', secureWorkspace: 'SECURE WORKSPACE', signInHelp: 'Sign in to manage deliveries and capture proof on the road.', workEmail: 'Work email', password: 'Password', driverAccount: 'Choose driver account', sixPassword: '6-digit password', continue: 'Continue', signingIn: 'Signing in…', passkey: 'Continue with Passkey', waitingPasskey: 'Waiting for Passkey…', demoAccount: 'Demo account', firstRun: 'First-run setup', todayTasks: 'Today’s tasks', waitingSync: 'Waiting to sync', profile: 'My profile', dashboard: 'Dashboard', deliveries: 'deliveries', route: 'View route', deliveryHistory: 'Delivery history', noPending: 'No pending work', syncNow: 'Sync now', adminConsole: 'ADMIN CONSOLE', demoAdmin: 'DEMO · ADMIN CONSOLE', management: 'MANAGEMENT', overview: 'Overview', drivers: 'Drivers', vehicles: 'Vehicles', accounts: 'Accounts', workspaceSetup: 'Workspace setup', productionNotice: 'Production mode is active. Driver, vehicle and account data must be provided by the Worker API.', setupMode: 'SETUP MODE', privateRoute: 'Private route' },
  'zh-CN': { language: '语言', english: 'English', simplified: '简体中文', traditional: '繁體中文', logout: '退出登录', online: '在线', offline: '离线', sync: '同步', driver: '司机', administrator: '管理员', welcome: '欢迎回来。', secureWorkspace: '安全工作区', signInHelp: '登录以管理配送并在途中采集交付凭证。', workEmail: '工作邮箱', password: '密码', driverAccount: '选择司机账号', sixPassword: '6位密码', continue: '继续', signingIn: '登录中…', passkey: '使用 Passkey 继续', waitingPasskey: '等待 Passkey…', demoAccount: '演示账号', firstRun: '首次设置', todayTasks: '今日任务', waitingSync: '待同步', profile: '我的', dashboard: '控制面板', deliveries: '配送', route: '查看路线', deliveryHistory: '配送历史', noPending: '没有待处理工作', syncNow: '立即同步', adminConsole: '管理控制台', demoAdmin: '演示 · 管理控制台', management: '管理', overview: '概览', drivers: '司机', vehicles: '车辆', accounts: '账号', workspaceSetup: '工作区设置', productionNotice: '当前为生产模式。司机、车辆和账号数据需要由 Worker API 提供。', setupMode: '设置模式', privateRoute: '私密路由' },
  'zh-TW': { language: '語言', english: 'English', simplified: '简体中文', traditional: '繁體中文', logout: '登出', online: '在線', offline: '離線', sync: '同步', driver: '司機', administrator: '管理員', welcome: '歡迎回來。', secureWorkspace: '安全工作區', signInHelp: '登入以管理配送，並在途中收集交付憑證。', workEmail: '工作電郵', password: '密碼', driverAccount: '選擇司機帳戶', sixPassword: '6位密碼', continue: '繼續', signingIn: '登入中…', passkey: '使用 Passkey 繼續', waitingPasskey: '等待 Passkey…', demoAccount: '示範帳戶', firstRun: '首次設定', todayTasks: '今日任務', waitingSync: '待同步', profile: '我的', dashboard: '控制面板', deliveries: '配送', route: '查看路線', deliveryHistory: '配送歷史', noPending: '沒有待處理工作', syncNow: '立即同步', adminConsole: '管理主控台', demoAdmin: '示範 · 管理主控台', management: '管理', overview: '概覽', drivers: '司機', vehicles: '車輛', accounts: '帳戶', workspaceSetup: '工作區設定', productionNotice: '目前為生產模式。司機、車輛和帳戶資料需要由 Worker API 提供。', setupMode: '設定模式', privateRoute: '私密路由' },
}

function readCookie() {
  const value = document.cookie.split('; ').find((entry) => entry.startsWith(`${COOKIE_NAME}=`))?.split('=')[1]
  return languages.includes(value) ? value : 'en'
}

export function setLanguage(language) {
  const next = languages.includes(language) ? language : 'en'
  document.cookie = `${COOKIE_NAME}=${next}; Max-Age=31536000; Path=/; SameSite=Lax`
  window.dispatchEvent(new CustomEvent('pod-language-change', { detail: next }))
}

export function useLanguage() {
  const [language, setCurrent] = useState(readCookie)
  useEffect(() => { document.documentElement.lang = language }, [language])
  useEffect(() => {
    const update = (event) => setCurrent(event.detail || readCookie())
    window.addEventListener('pod-language-change', update)
    return () => window.removeEventListener('pod-language-change', update)
  }, [])
  return { language, setLanguage, t: (key) => translations[language]?.[key] || translations.en[key] || key }
}

export function LanguageSwitcher() {
  const { language, setLanguage: change, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const options = [{ value: 'en', label: t('english') }, { value: 'zh-CN', label: t('simplified') }, { value: 'zh-TW', label: t('traditional') }]
  return <div className="language-switcher"><button type="button" className="language-button" onClick={() => setOpen((value) => !value)} aria-label={t('language')} aria-expanded={open} title={t('language')}><i className="fa-solid fa-language" aria-hidden="true" /></button>{open && <div className="language-menu" role="menu">{options.map((option) => <button type="button" key={option.value} className={language === option.value ? 'active' : ''} onClick={() => { change(option.value); setOpen(false) }} role="menuitem">{option.label}</button>)}</div>}</div>
}
