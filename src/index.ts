import type { YapiApiData } from './views/api'
import { defineExtension, useCommand } from 'reactive-vscode'
import { crabuApiBaseUrl } from './constants/api'
import { commands } from './generated/meta'
import { logger } from './utils'
import { useApiTreeView } from './views/api'
import { useApiDetailView } from './views/crabu'

const { activate, deactivate } = defineExtension(() => {
  useApiTreeView()

  useCommand(commands.addToMock, async (event) => {
    logger.info('Adding API to mock:', JSON.stringify(event, null, 2))

    if (!event.treeItem || !event.treeItem.apiData) {
      logger.error('No API data found in the event tree item.')
      return
    }

    const api = event.treeItem.apiData as YapiApiData

    await fetch(`${crabuApiBaseUrl}/interface/add/${api.project_id}/${api._id}`, { method: 'POST' })
    useApiDetailView(api)
  })

  useCommand(commands.showCrabuWebview, useApiDetailView)
})

export { activate, deactivate }
