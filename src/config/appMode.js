const configuredMode = import.meta.env.APP_MODE

export const APP_MODE = configuredMode === 'demo' ? 'demo' : 'production'
export const IS_DEMO = APP_MODE === 'demo'
