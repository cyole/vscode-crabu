import type { FetchResponse } from './types'
import { useLogger } from 'reactive-vscode'
import { displayName } from './generated/meta'

export const logger = useLogger(displayName)

export async function fetchYapiData<T>(url: string, query: Record<string, string>): Promise<T> {
  const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&')
  const requestUrl = `${url}?${queryString}`

  const data = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.json()) as FetchResponse<T>

  return data.data
}

export async function ofetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  const data = await response.json() as { code: number, data: T, message: string }

  if (data.code !== 0) {
    throw new Error(`${data.code} ${data.message}`)
  }

  return data.data
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
