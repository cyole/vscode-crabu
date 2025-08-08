import { defineExtension } from 'reactive-vscode'
import { useAnnotations } from './annotations'
import { useCommands } from './commands'
import { useCrabuMockStatus } from './status'
import { useAiTreeView } from './views/ai'
import { useApiTreeView } from './views/api'
import { useMockTreeView } from './views/mock'

const { activate, deactivate } = defineExtension(async () => {
  useApiTreeView()
  useMockTreeView()
  useAiTreeView()
  useCrabuMockStatus()
  useAnnotations()
  useCommands()
})

export { activate, deactivate }
