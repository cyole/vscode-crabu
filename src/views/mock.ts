import type { TreeViewNode } from 'reactive-vscode'
import type { ApiDetail, MockApiData } from '../types'
import { parse, stringify } from 'comment-json'
import { createSingletonComposable, executeCommand, ref, useCommand, useTreeView } from 'reactive-vscode'
import { TreeItemCollapsibleState, Uri, window, workspace } from 'vscode'
import { config } from '../config'
import { crabuDiffNewScheme, crabuDiffOldScheme } from '../constants'
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
      const resp = await fetch(`${config.crabuServerBaseUrl}/interface/list`)
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
    await fetch(`${config.crabuServerBaseUrl}/interface/remove/${mockItem.key}`, { method: 'POST' })
    await refreshMockTreeView()
  })

  useCommand(commands.updateMockToLatestVersion, async (event) => {
    if (!event.treeItem || !event.treeItem.mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

    const mockItem = event.treeItem.mockItem as MockApiData
    await executeCommand(commands.addApiToMock, {
      treeItem: {
        apiData: transformMockToApiData(mockItem),
      },
    })
  })

  useCommand(commands.addApiToMockByUrl, async () => {
    const url = await window.showInputBox({
      prompt: '请输入Yapi接口地址',
      placeHolder: `例如：${config.yapiBaseUrl}/project/52/interface/api/13746`,
      validateInput: (value) => {
        if (!value) {
          return '请输入Yapi接口地址'
        }

        if (!value.startsWith(config.yapiBaseUrl)) {
          return `请输入已配置的Yapi地址：${config.yapiBaseUrl}`
        }

        return null
      },
    })

    if (!url) {
      return
    }

    const [project_id, id] = url.split('/').map(item => Number.parseInt(item)).filter(item => !Number.isNaN(item))

    if (!project_id || !id) {
      window.showErrorMessage('请输入正确的Yapi接口地址')
      return
    }

    executeCommand(commands.addApiToMock, {
      treeItem: {
        apiData: {
          project_id,
          _id: id,
        },
      },
    })
  })

  useCommand(commands.aiGenerateMock, async (event) => {
    if (!event.treeItem || !event.treeItem.mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

    const mockItem = event.treeItem.mockItem as MockApiData
    const [projectId, catId, interfaceId] = mockItem.key.split('/')
    await ofetch(`${config.crabuServerBaseUrl}/mock/template/ai/${projectId}/${catId}/${interfaceId}`, {
      method: 'POST',
    })
  })

  useCommand(commands.compareWithLatestVersion, async (event) => {
    if (!event.treeItem || !event.treeItem.mockItem) {
      logger.error('No mock item found in the event.')
      return
    }

    const mockItem = event.treeItem.mockItem as MockApiData
    const [projectId, , interfaceId] = mockItem.key.split('/')
    const oldDetail = await ofetch<ApiDetail>(`${config.crabuServerBaseUrl}/interface/local/json/${mockItem.key}`)
    const newDetail = await ofetch<ApiDetail>(`${config.crabuServerBaseUrl}/interface/json/${projectId}/${interfaceId}`)

    oldDetail.req_body = parse(oldDetail.req_body as string)
    oldDetail.res_body = parse(oldDetail.res_body as string)
    newDetail.req_body = parse(newDetail.req_body as string)
    newDetail.res_body = parse(newDetail.res_body as string)

    workspace.registerTextDocumentContentProvider(crabuDiffOldScheme, {
      provideTextDocumentContent: () => {
        return stringify(oldDetail, null, 2)
      },
    })

    workspace.registerTextDocumentContentProvider(crabuDiffNewScheme, {
      provideTextDocumentContent: () => {
        return stringify(newDetail, null, 2)
      },
    })

    const oldUri = Uri.parse(`${crabuDiffOldScheme}:${mockItem.label}.jsonc`)
    const newUri = Uri.parse(`${crabuDiffNewScheme}:${mockItem.label}.jsonc`)

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
