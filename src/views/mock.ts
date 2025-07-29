import type { TreeViewNode } from 'reactive-vscode'
import type { ApiDetail, MockApiData } from '../types'
import { createSingletonComposable, executeCommand, ref, useCommand, useTreeView } from 'reactive-vscode'
import { TreeItemCollapsibleState, Uri, window, workspace } from 'vscode'
import { crabuApiBaseUrl } from '../constants/api'
import { crabuDiffNewScheme, crabuDiffOldScheme } from '../constants/document'
import { commands } from '../generated/meta'
import { logger, ofetch } from '../utils'
import { useApiDetailView } from './crabu'

export function transformMockToApiData(mockItem: MockApiData) {
  const apiInfo = mockItem.key.split('/')
  const apiData = {
    project_id: Number(apiInfo?.[0]),
    catid: apiInfo?.[1],
    _id: apiInfo?.[2],
    title: mockItem.label,
    path: '',
    method: 'POST',
  }

  return apiData
}

function handleData(data: MockApiData[]) {
  const result: TreeViewNode[] = []

  function handleItem(item: MockApiData) {
    const isLeaf = !item.children?.length
    return {
      treeItem: {
        label: item.label,
        collapsibleState: isLeaf ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Expanded,
        contextValue: isLeaf ? 'mockItem' : 'mockNode',
        mockItem: item,
      },
      children: isLeaf ? undefined : handleData(item.children!),
    }
  }

  for (const item of data) {
    result.push(handleItem(item))
  }

  return result
}

export const useMockTreeView = createSingletonComposable(async () => {
  const roots = ref<TreeViewNode[]>([])

  async function getRootNode() {
    try {
      const resp = await fetch(`${crabuApiBaseUrl}/interface/list`)
      const data = (await resp.json()) as { data: MockApiData[] }

      // 递归处理数据
      const result = handleData(data.data)
      return result
    }
    catch (error) {
      logger.error(error)
      return []
    }
  }

  async function refreshMockTreeView() {
    window.withProgress({
      location: { viewId: 'mockTreeView' },
    }, async (progress) => {
      progress.report({ message: '正在更新Mock数据...' })
      roots.value = await getRootNode()
    })
  }

  await refreshMockTreeView()

  useCommand(commands.refreshMockTreeView, refreshMockTreeView)
  useCommand(commands.showCrabuWebviewWithMock, (event) => {
    if (!event.treeItem || !event.treeItem.mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

    const mockItem = event.treeItem.mockItem as MockApiData
    const apiData = transformMockToApiData(mockItem)

    useApiDetailView(apiData)
  })

  useCommand(commands.removeFromMock, async (event) => {
    if (!event.treeItem || !event.treeItem.mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

    const mockItem = event.treeItem.mockItem as MockApiData
    await fetch(`${crabuApiBaseUrl}/interface/remove/${mockItem.key}`, { method: 'POST' })
    await refreshMockTreeView()
  })

  useCommand(commands.compareWithLatestVersion, async (event) => {
    if (!event.treeItem || !event.treeItem.mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

    const mockItem = event.treeItem.mockItem as MockApiData
    const [projectId, , interfaceId] = mockItem.key.split('/')
    const oldDetail = await ofetch<ApiDetail>(`${crabuApiBaseUrl}/interface/local/json/${mockItem.key}`)
    const newDetail = await ofetch<ApiDetail>(`${crabuApiBaseUrl}/interface/json/${projectId}/${interfaceId}`)

    oldDetail.req_body = JSON.parse(oldDetail.req_body)
    oldDetail.res_body = JSON.parse(oldDetail.res_body)
    newDetail.req_body = JSON.parse(newDetail.req_body)
    newDetail.res_body = JSON.parse(newDetail.res_body)

    workspace.registerTextDocumentContentProvider(crabuDiffOldScheme, {
      provideTextDocumentContent: () => {
        return JSON.stringify(oldDetail, null, 2)
      },
    })

    workspace.registerTextDocumentContentProvider(crabuDiffNewScheme, {
      provideTextDocumentContent: () => {
        return JSON.stringify(newDetail, null, 2)
      },
    })

    const oldUri = Uri.parse(`${crabuDiffOldScheme}:${mockItem.label}.json`)
    const newUri = Uri.parse(`${crabuDiffNewScheme}:${mockItem.label}.json`)

    executeCommand('vscode.diff', oldUri, newUri, `检查变更：${mockItem.label}`)
  })

  return useTreeView(
    'mockTreeView',
    roots,
    {
      showCollapseAll: true,
    },
  )
})
