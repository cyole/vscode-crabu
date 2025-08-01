import { defineExtension } from 'reactive-vscode'
import { useCommands } from './commands'
import { useCrabuMockStatus } from './status'
import { useApiTreeView } from './views/api'
import { useMockTreeView } from './views/mock'

const { activate, deactivate } = defineExtension(async () => {
  useApiTreeView()
  useMockTreeView()
  useCrabuMockStatus()
  useCommands()
})

export { activate, deactivate }
