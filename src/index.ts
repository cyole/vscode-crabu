import { defineExtension, useCommand } from 'reactive-vscode'
import { commands } from './generated/meta'
import { useApiTreeView } from './views/api'
import { useApiDetailView } from './views/crabu'
import { useMockTreeView } from './views/mock'

const { activate, deactivate } = defineExtension(() => {
  useApiTreeView()
  useMockTreeView()

  useCommand(commands.showCrabuWebview, useApiDetailView)
})

export { activate, deactivate }
