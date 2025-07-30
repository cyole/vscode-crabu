import { computed, ref, useCommand, useStatusBarItem } from 'reactive-vscode'
import { StatusBarAlignment, ThemeColor, window } from 'vscode'
import { crabuApiBaseUrl } from './constants/api'
import { commands } from './generated/meta'
import { logger, ofetch, sleep } from './utils'

export async function useCrabuMockStatus() {
  let isSwitching = false
  const crabuMockStatus = ref(false)

  async function updateCrabuMockStatus() {
    crabuMockStatus.value = await ofetch<boolean>(`${crabuApiBaseUrl}/mock/status`)
  }

  const statusBarItemText = computed(() => {
    return crabuMockStatus.value ? 'Mock 已启动' : 'Mock 未启动'
  })

  const statusBarItemColor = computed(() => {
    return crabuMockStatus.value
      ? new ThemeColor('statusBarItem.prominentBackground')
      : undefined
  })

  await updateCrabuMockStatus()

  const statusBarItem = useStatusBarItem({
    alignment: StatusBarAlignment.Left,
    text: statusBarItemText,
    color: statusBarItemColor,
    command: commands.switchMockStatus,
  })

  window.onDidChangeWindowState((e) => {
    if (e.focused) {
      updateCrabuMockStatus()
    }
  })

  useCommand(commands.switchMockStatus, async () => {
    if (isSwitching)
      return

    isSwitching = true
    statusBarItem.text = `$(loading~spin) ${crabuMockStatus.value ? '停止中...' : '启动中...'}`
    await sleep(1000)
    await ofetch(`${crabuApiBaseUrl}/mock/on`, {
      method: 'POST',
    })
    await updateCrabuMockStatus()
    isSwitching = false

    logger.info('Mock 状态更新为：', crabuMockStatus.value)
  })
}
