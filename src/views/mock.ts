import type { TreeViewNode } from 'reactive-vscode'
import type { MockApiData } from '../types'
import { createSingletonComposable, ref, useCommand, useTreeView } from 'reactive-vscode'
import { TreeItemCollapsibleState, window } from 'vscode'
import { crabuApiBaseUrl } from '../constants/api'
import { commands } from '../generated/meta'
import { logger } from '../utils'
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
        collapsibleState: isLeaf ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Collapsed,
        contextValue: isLeaf ? 'mockItem' : 'mockNode',
        mockItem: item,
        command: {
          command: commands.showCrabuWebviewWithMock,
          title: '查看',
          arguments: [item],
        },
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
  useCommand(commands.showCrabuWebviewWithMock, (mockItem: MockApiData) => {
    if (!mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

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

  return useTreeView(
    'mockTreeView',
    roots,
    {
      showCollapseAll: true,
    },
  )
})
