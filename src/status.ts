import { useTimeoutPoll } from '@vueuse/core'
import { computed, ref, useCommand, useStatusBarItem, watchEffect } from 'reactive-vscode'
import { StatusBarAlignment, ThemeColor, window } from 'vscode'
import { config } from './config'
import { commands } from './generated/meta'
import { logger, ofetch, sleep } from './utils'

export async function useCrabuMockStatus() {
  let isSwitching = false
  const crabuMockStatus = ref(false)
  const crabuMockStatusError = ref(false)

  const crabuStatusBarItemText = computed(() => {
    if (crabuMockStatusError.value)
      return 'Crabu 服务异常'

    return crabuMockStatus.value ? 'Mock 已启动' : 'Mock 未启动'
  })

  const crabuStatusBarItemColor = computed(() => {
    return crabuMockStatus.value
      ? new ThemeColor('statusBarItem.prominentBackground')
      : undefined
  })

  const crabuStatusBarItemBackgroundColor = computed(() => {
    return crabuMockStatusError.value
      ? new ThemeColor('statusBarItem.warningBackground')
      : undefined
  })

  const crabuStatusBarItem = useStatusBarItem({
    alignment: StatusBarAlignment.Left,
    text: crabuStatusBarItemText,
    color: crabuStatusBarItemColor,
    backgroundColor: crabuStatusBarItemBackgroundColor,
    command: commands.switchMockStatus,
  })

  const aiQueueStatusBarItemText = ref('')
  const { pause, resume } = useTimeoutPoll(updateAiQueueStatus, 1000)

  async function updateAiQueueStatus() {
    logger.info('更新 AI 队列状态中...')
    const aiQueue = await ofetch<{
      processing: number
      waiting: number
    }>(`${config.crabuServerBaseUrl}/mock/template/ai/process`)

    if (aiQueue.processing + aiQueue.waiting === 0) {
      pause()
      aiQueueStatusBarItemText.value = ''
      return
    }
    aiQueueStatusBarItemText.value = `$(loading~spin) 进行中 ${aiQueue.processing} 排队中 ${aiQueue.waiting}`
  }

  useStatusBarItem({
    alignment: StatusBarAlignment.Left,
    text: aiQueueStatusBarItemText,
    color: new ThemeColor('statusBarItem.prominentBackground'),
  })

  window.onDidChangeWindowState((e) => {
    if (e.focused) {
      updateCrabuMockStatus()
    }
  })

  async function updateCrabuMockStatus() {
    logger.info('更新 Mock 状态中...')
    try {
      crabuMockStatus.value = await ofetch<boolean>(`${config.crabuServerBaseUrl}/mock/status`)
      crabuMockStatusError.value = false
    }
    catch (error) {
      logger.error('获取 Mock 状态失败：', error)
      crabuMockStatusError.value = true
    }
  }

  watchEffect(updateCrabuMockStatus)

  useCommand(commands.switchMockStatus, async () => {
    if (crabuMockStatusError.value || isSwitching)
      return

    isSwitching = true
    crabuStatusBarItem.text = `$(loading~spin) ${crabuMockStatus.value ? '停止中...' : '启动中...'}`
    await sleep(1000)
    await ofetch(`${config.crabuServerBaseUrl}/mock/on`, {
      method: 'POST',
    })
    await updateCrabuMockStatus()
    isSwitching = false

    logger.info('Mock 状态更新为：', crabuMockStatus.value)
  })

  useCommand(commands.updateAiQueueStatus, async (action: 'start' | 'stop') => {
    if (action === 'start') {
      resume()
    }
    else {
      pause()
    }
  })
}
