import type { MockApiData, YapiApiItem } from './types'
import { defineExtension, useActiveTextEditor, useCommand } from 'reactive-vscode'
import { FileType, Position, Uri, window, workspace } from 'vscode'
import { genCode } from './gen'
import { commands } from './generated/meta'
import { useCrabuMockStatus } from './status'
import { logger } from './utils'
import { useApiTreeView } from './views/api'
import { useApiDetailView } from './views/crabu'
import { transformMockToApiData, useMockTreeView } from './views/mock'

const { activate, deactivate } = defineExtension(async () => {
  useApiTreeView()
  useMockTreeView()
  useCrabuMockStatus()

  useCommand(commands.showCrabuWebview, useApiDetailView)

  useCommand(commands.genBusinessCode, async (event) => {
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

    const currentEditor = useActiveTextEditor()
    const currentDocument = currentEditor?.value?.document
    if (!currentDocument) {
      logger.error('No active text editor found.')
      return
    }

    const currentFileName = currentDocument?.fileName
    const currentDir = currentFileName?.split('/').slice(0, -1).join('/') ?? ''

    const files = await workspace.fs.readDirectory(Uri.parse(currentDir))
    const dtsFile = files.find(file => file[0].endsWith('.d.ts') && file[1] === FileType.File)

    if (!dtsFile) {
      logger.error('No dts file found.')
      return
    }

    const dtsFileUri = Uri.joinPath(Uri.parse(currentDir), dtsFile?.[0] ?? '')

    const ns = (await workspace.fs.readFile(dtsFileUri))
      .toString()
      .match(/declare namespace (\w+)/)?.[1] ?? ''

    const genCodeResult = await genCode(api, ns)
    logger.info('Generated TypeScript types:', genCodeResult)

    currentEditor.value?.edit((editBuilder) => {
      editBuilder.insert(new Position(currentDocument?.lineCount ?? 0, 0), genCodeResult.requestCode)
    })

    const dtsDoc = await workspace.openTextDocument(dtsFileUri)
    const dtsEditor = await window.showTextDocument(dtsDoc)
    const lastBraceIndex = dtsDoc.getText()?.split('\n').lastIndexOf('}') ?? 0

    dtsEditor.edit((editBuilder) => {
      editBuilder.insert(new Position(lastBraceIndex, 0), genCodeResult.typesCode)
    })

    window.showTextDocument(currentDocument)
  })
})

export { activate, deactivate }
