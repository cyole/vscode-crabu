import type { Nullable } from 'reactive-vscode'
import type { WebviewPanel } from 'vscode'
import type { YapiApiData } from './api'
import getHtml from '@tomjs/vscode-extension-webview'
import { useWebviewPanel } from 'reactive-vscode'
import { ViewColumn } from 'vscode'

let openedPanel: Nullable<WebviewPanel>

export async function useApiDetailView(apiData?: YapiApiData) {
  function getWebviewContent() {
    if (!apiData) {
      return getHtml({ serverUrl: 'http://localhost' })
    }

    const { project_id, catid, _id } = apiData
    return getHtml({ serverUrl: `http://localhost/api-detail/${project_id}/${catid}/${_id}` })
  }

  if (openedPanel) {
    openedPanel.webview.html = getWebviewContent()
    openedPanel?.reveal(ViewColumn.Active)
    return
  }

  const { panel } = useWebviewPanel(
    `crabuWebview`,
    `Crabu`,
    getWebviewContent(),
    {
      viewColumn: ViewColumn.Active,
    },
    {
      enableFindWidget: true,
      retainContextWhenHidden: true,
      webviewOptions: {
        enableScripts: true,
        enableCommandUris: true,
      },
    },
  )

  openedPanel = panel

  panel.onDidDispose(() => {
    openedPanel = undefined
  })
}
