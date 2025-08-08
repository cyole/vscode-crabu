import type { TreeViewNode } from 'reactive-vscode'
import type { MockApiData } from '../types'
import { createSingletonComposable, ref, useCommand, useTreeView, watchEffect } from 'reactive-vscode'
import { ThemeIcon } from 'vscode'
import { config } from '../config'
import { commands } from '../generated/meta'
import { logger, ofetch } from '../utils'
import { useMockTreeView } from './mock'

export const useAiTreeView = createSingletonComposable(async () => {
  const roots = ref<TreeViewNode[]>([])
  const treeView = useTreeView(
    'aiQueueTreeView',
    roots,
  )

  async function getRootNode() {
    const { roots: mockRoots } = await useMockTreeView()
    const resolvedMockRoots = await Promise.all(
      mockRoots.value.map(async root => ({
        ...root,
        children: root.children instanceof Promise ? await root.children : root.children,
      })),
    )

    const mockDataList = resolvedMockRoots
      .flatMap(root => root.children || [])
      .flatMap(node => node.children || [])
      .map(node => node.treeItem as { mockItem: MockApiData })

    try {
      const ids = await ofetch<number[]>(`${config.crabuServerBaseUrl}/mock/template/ai/process/detail`)

      const data = ids.map((id) => {
        const mockData = mockDataList.find(item => item.mockItem.key.includes(`${id}`))
        return {
          label: mockData?.mockItem.label,
          id,
        }
      })

      roots.value = data.map(item => ({
        treeItem: {
          label: `#${item.id} ${item.label || ''}`,
          iconPath: new ThemeIcon('clock'),
          cancelId: item.id,
          contextValue: 'aiQueueItem',
        },
      }))

      treeView.badge = {
        tooltip: `${roots.value.length}个AI任务执行中`,
        value: roots.value.length,
      }
    }
    catch (error) {
      logger.error(error)
      return []
    }
  }

  watchEffect(getRootNode)

  useCommand(commands.refreshAiQueueTreeView, getRootNode)

  useCommand(commands.cancelAiTask, async (event) => {
    if (!event.treeItem || !event.treeItem.cancelId) {
      logger.error('No cancelId found in the event tree item.')
      return
    }

    await ofetch(`${config.crabuServerBaseUrl}/mock/template/ai/cancel/${event.treeItem.cancelId}`, {
      method: 'POST',
    })
    logger.info('取消AI任务')

    await getRootNode()
  })
})
