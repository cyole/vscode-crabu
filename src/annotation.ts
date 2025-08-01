import type { TreeViewNode } from 'reactive-vscode'
import type { DecorationOptions } from 'vscode'
import type { YapiApiItem } from './types'
import { extensionContext, ref, shallowRef, useActiveEditorDecorations, useActiveTextEditor, useTextEditorSelections, watchEffect } from 'reactive-vscode'
import { Range } from 'vscode'
import { storageApiTreeDataKey } from './constants/storage'

export async function useAnnotations() {
  const editor = useActiveTextEditor()
  const selections = useTextEditorSelections(editor)

  const decorationsOverride = shallowRef<DecorationOptions[]>([])
  const decorationsHover = shallowRef<DecorationOptions[]>([])
  const allApiData = ref<YapiApiItem[]>([])

  const storageApiTreeData = extensionContext.value?.globalState.get<TreeViewNode[]>(storageApiTreeDataKey) ?? []

  const resolvedRoots = await Promise.all(
    storageApiTreeData.map(async root => ({
      ...root,
      children: root.children instanceof Promise ? await root.children : root.children,
    })),
  )

  allApiData.value = resolvedRoots
    .flatMap(root => root.children || [])
    .flatMap(node => (node.children || []) as TreeViewNode[])
    .map((node: TreeViewNode) => {
      const treeItem = node.treeItem
      return (treeItem as { apiData: YapiApiItem }).apiData
    })
    .filter(Boolean)

  useActiveEditorDecorations(
    {
      opacity: '0; display: none;',
    },
    decorationsOverride,
  )

  // calculate decorations
  watchEffect(async () => {
    if (!editor.value || !editor.value.document) {
      decorationsOverride.value = []
      decorationsHover.value = []
      return
    }

    const { document } = editor.value

    const matchedApiData = allApiData.value.map((item) => {
      const regex = new RegExp(`'${item.path}'`, 'g')
      const match = regex.exec(document.getText())

      if (!match) {
        return undefined
      }

      return {
        ...item,
        match,
      }
    }).filter(i => i !== undefined)

    decorationsOverride.value = matchedApiData.map(({ title, match }) => {
      const startPos = document.positionAt(match.index)
      const endPos = document.positionAt(match.index + match[0].length)

      const range = new Range(startPos, endPos)
      let inSelection = false
      for (const selection of selections.value) {
        if (selection.contains(range)) {
          inSelection = true
          break
        }

        const lines = [selection.start.line, selection.end.line]
        if (lines.includes(range.start.line) || lines.includes(range.end.line)) {
          inSelection = true
          break
        }
      }

      if (inSelection) {
        return undefined
      }

      const item: DecorationOptions = {
        range,
        renderOptions: {
          after: {
            contentText: title,
            color: '#9D5BF4',
            backgroundColor: `#9D5BF420; border-radius: 0.2em; padding: 0 0.2em;`,
          },
        },
      }

      return item
    })
      .filter(i => i !== undefined)
  })
}
