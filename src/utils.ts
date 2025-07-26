import type { Webview } from 'vscode'
import { useLogger } from 'reactive-vscode'
import { Uri } from 'vscode'
import { displayName } from './generated/meta'

export const logger = useLogger(displayName)

interface YapiResponse<T> {
  data: T
  errcode: number
  errmsg: string
}

export async function request<T>(url: string, query: Record<string, string>): Promise<T> {
  const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&')
  const requestUrl = `${url}?${queryString}`

  const data = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  }).then(res => res.json()) as YapiResponse<T>

  return data.data
}

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}

export function uuid() {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
