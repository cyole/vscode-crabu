import type { TreeViewNode } from 'reactive-vscode'
import type { ScopedConfigKeyTypeMap } from '../generated/meta'
import type { YapiApiItem, YapiMenuData } from '../types'
import { createSingletonComposable, executeCommand, extensionContext, ref, useCommand, useTreeView, watchEffect } from 'reactive-vscode'
import { ProgressLocation, TreeItemCollapsibleState, window } from 'vscode'
import { config } from '../config'
import { apiListMenu, crabuApiBaseUrl } from '../constants/api'
import { storageApiTreeDataKey, storageApiTreeDataUpdateAtKey } from '../constants/storage'
import { commands } from '../generated/meta'
import { fetchYapiData, logger, ofetch } from '../utils'

type Project = ScopedConfigKeyTypeMap['yapiProjects'][number]

async function getYapiMenuData(projectId?: number, token?: string) {
  if (!projectId || !token) {
    logger.error(`getYapiMenuData: projectId or token is empty, projectId: ${projectId}, token: ${token}`)
    return []
  }

  const data = await fetchYapiData<YapiMenuData[]>(`${config.yapiBaseUrl}${apiListMenu}`, {
    project_id: projectId.toString(),
    token,
  })

  logger.info(`请求getYapiMenuData结束 -> ${projectId}`)

  return data
}

export const useApiTreeView = createSingletonComposable(async () => {
  const roots = ref<TreeViewNode[]>([])

  async function getRootNode(projects: Project[]) {
    return await Promise.all(projects.map(async project => ({
      children: await getChildNodes(project),
      treeItem: {
        label: project.name,
        collapsibleState: TreeItemCollapsibleState.Collapsed,
      },
    })))
  }

  async function getChildNodes(project: Project): Promise<TreeViewNode[]> {
    const data = (await getYapiMenuData(project.id, project.token))
      .filter(item => item.list.length > 0)

    return data.map(group => ({
      treeItem: {
        label: group.name,
        description: group.desc || '',
        contextValue: 'apiGroup',
        project,
        collapsibleState: TreeItemCollapsibleState.Collapsed,
      },
      children: group.list.map((item) => {
        item.project_token = project.token
        return {
          treeItem: {
            label: item.title,
            description: `${item.method.toUpperCase()} ${item.path || ''}`,
            contextValue: 'apiItem',
            project,
            apiData: item,
          },
        }
      }),
    }))
  }

  async function refreshApiTreeView() {
    window.withProgress({
      location: { viewId: 'apiTreeView' },
    }, async (progress) => {
      progress.report({ message: '正在更新API数据...' })
      roots.value = await getRootNode(config.yapiProjects)
      extensionContext.value?.globalState.update(storageApiTreeDataKey, roots.value)
      extensionContext.value?.globalState.update(storageApiTreeDataUpdateAtKey, new Date().toLocaleString())
    })
  }

  watchEffect(async () => {
    const projectList = config.yapiProjects
    const storage = extensionContext.value?.globalState.get<TreeViewNode[]>(storageApiTreeDataKey)

    if (storage && storage.length === projectList.length) {
      logger.info('从本地缓存中获取数据')
      roots.value = storage
      return
    }

    await refreshApiTreeView()
  })

  useCommand(commands.refreshApiTreeView, refreshApiTreeView)

  useCommand(commands.getApiTreeDataUpdateTime, async () => {
    const updateAt = extensionContext.value?.globalState.get<string>(storageApiTreeDataUpdateAtKey)
    if (updateAt) {
      window.showInformationMessage(`API数据最后更新时间: ${updateAt}`)
    }
    else {
      window.showInformationMessage('API数据未更新')
    }
  })

  useCommand(commands.addApiToMock, async (event) => {
    if (!event.treeItem || !event.treeItem.apiData) {
      logger.error('No API data found in the event tree item.')
      return
    }

    const api = event.treeItem.apiData as YapiApiItem

    await ofetch(`${crabuApiBaseUrl}/interface/add/${api.project_id}/${api._id}`, { method: 'POST' })
    await executeCommand(commands.refreshMockTreeView)
  })

  useCommand(commands.addApiGroupToMock, async (event) => {
    if (!event || !event.children) {
      logger.error('No API data found in the event tree item.')
    }

    const children = event.children as { treeItem: { apiData: YapiApiItem } }[]
    const apiList = children.map(child => child.treeItem.apiData)

    const totalCount = apiList.length
    let failedCount = 0

    await window.withProgress({
      location: ProgressLocation.Notification,
      cancellable: true,
    }, async (progress) => {
      progress.report({ message: '正在导入API...' })

      for (let i = 0; i < totalCount; i++) {
        const api = apiList[i]

        try {
          await ofetch(`${crabuApiBaseUrl}/interface/add/${api.project_id}/${api._id}`, { method: 'POST' })
          progress.report({
            message: `正在导入API... ${i + 1}/${totalCount}`,
            increment: (i / totalCount) * 100,
          })
        }
        catch {
          failedCount++
        }
      }
    })

    window.showInformationMessage(`共导入 ${apiList.length} 个接口，${failedCount} 个接口导入失败`)

    await executeCommand(commands.refreshMockTreeView)

    logger.info(`addApiGroupToMock: ${JSON.stringify(apiList, null, 2)}`)
  })

  useCommand(commands.searchApi, async () => {
    const searchTerm = await window.showInputBox({
      prompt: '请输入API名称或路径进行搜索',
      placeHolder: '例如：订单列表 或 /order/list',
    })

    if (!searchTerm)
      return

    const resolvedRoots = await Promise.all(
      roots.value.map(async root => ({
        ...root,
        children: root.children instanceof Promise ? await root.children : root.children,
      })),
    )

    const results = resolvedRoots
      .flatMap(root => root.children || [])
      .flatMap(node => node.children || [])
      .filter(node => node.treeItem.label.includes(searchTerm) || node.treeItem.description?.includes(searchTerm))

    if (results.length === 0) {
      window.showInformationMessage('未找到匹配的API')
      return
    }

    const selection = await window.showQuickPick(results.map(node => ({
      node,
      label: `${node.treeItem.project.name}: ${node.treeItem.label}`,
      detail: node.treeItem.description,
    })), {
      placeHolder: '选择一个API',
      matchOnDescription: true,
      matchOnDetail: true,
    })

    if (selection) {
      logger.info(`选择了API: ${JSON.stringify(selection)}`)
    }

    const action = await window.showQuickPick(
      [
        { label: '添加到Mock', value: commands.addApiToMock },
        { label: '生成请求代码', value: commands.genRequestCode },
        { label: '生成TypeScript类型', value: commands.genTypeScriptTypes },
        { label: '对比最新版本', value: commands.compareWithLatestVersion },
      ],
      {
        placeHolder: '选择操作',
      },
    )

    if (!action)
      return

    executeCommand(action.value, selection?.node)
  })

  useCommand(commands.searchApiGroup, async () => {
    const searchTerm = await window.showInputBox({
      prompt: '请输入API分组名称进行搜索',
      placeHolder: '例如：订单',
    })

    if (!searchTerm)
      return

    const resolvedRoots = await Promise.all(
      roots.value.map(async root => ({
        ...root,
        children: root.children instanceof Promise ? await root.children : root.children,
      })),
    )

    const results = resolvedRoots.flatMap(root => root.children || [])
      .filter(node => node.treeItem.label.includes(searchTerm))

    if (results.length === 0) {
      window.showInformationMessage('未找到匹配的API分组')
      return
    }

    const selection = await window.showQuickPick(results.map(node => ({
      node,
      label: `${node.treeItem.project.name}: ${node.treeItem.label}`,
      description: node.treeItem.description,
    })), {
      placeHolder: '选择一个API分组',
      matchOnDescription: true,
    })

    logger.info(`选择了API分组: ${JSON.stringify(selection, null, 2)}`)

    executeCommand(commands.addApiGroupToMock, selection?.node)
  })

  return useTreeView(
    'apiTreeView',
    roots,
    {
      showCollapseAll: true,
    },
  )
})
