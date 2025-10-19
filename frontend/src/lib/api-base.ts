const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const ensureApiSuffix = (value: string) => {
  const normalized = trimTrailingSlashes(value)
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`
}

export const getApiBaseUrl = (): string => {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim()
  if (envBase) {
    return trimTrailingSlashes(envBase)
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (envUrl) {
    return ensureApiSuffix(envUrl)
  }

  if (process.env.NODE_ENV === 'development') {
    return '/api'
  }

  return '/api'
}
