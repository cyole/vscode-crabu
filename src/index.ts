import type { MockApiData, YapiApiItem } from './types'
import { defineExtension, useCommand } from 'reactive-vscode'
import { window } from 'vscode'
import { genRequestCode, genTypeScriptTypes } from './gen'
import { commands } from './generated/meta'
import { logger } from './utils'
import { useApiTreeView } from './views/api'
import { useApiDetailView } from './views/crabu'
import { transformMockToApiData, useMockTreeView } from './views/mock'

const { activate, deactivate } = defineExtension(() => {
  useApiTreeView()
  useMockTreeView()

  useCommand(commands.genRequestCode, async (event) => {
    if (!event.treeItem) {
      logger.error('No API data found in the event tree item.')
      return
    }

    const api = event.treeItem.contextValue === 'apiItem'
      ? event.treeItem.apiData as YapiApiItem
      : transformMockToApiData(event.treeItem.mockItem as MockApiData)

    if (!api) {
      logger.error('No API data found in the event tree item.')
      return
    }

    const code = await genRequestCode(api)
    // 插入到当前文件光标处
    const editor = window.activeTextEditor
    if (editor) {
      editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.start, `${code}\n`)
      })
    }

    logger.info('Generated request code:', code)
  })

  useCommand(commands.genTypeScriptTypes, async (event) => {
    if (!event.treeItem) {
      logger.error('No API data found in the event tree item.')
      return
    }

    const api = 'apiData' in event.treeItem
      ? event.treeItem.apiData as YapiApiItem
      : transformMockToApiData(event.treeItem.mockItem as MockApiData)

    if (!api) {
      logger.error('No API data found in the event tree item.')
      return
    }

    const code = await genTypeScriptTypes(api)
    logger.info('Generated TypeScript types:', code)
  })

  useCommand(commands.showCrabuWebview, useApiDetailView)
})

export { activate, deactivate }
