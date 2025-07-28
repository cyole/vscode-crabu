import type { ApiDetailInfo, YapiApiData } from './types'
import { config } from './config'
import { apiDetail } from './constants/api'
import { logger, request } from './utils'

async function getApiDetail(api: YapiApiData) {
  const token = api.project_token ?? config.yapiProjects.find(project => project.id === api.project_id)?.token ?? ''
  const data = await request<ApiDetailInfo>(`${config.yapiBaseUrl}${apiDetail}`, {
    id: api._id,
    token,
  })

  logger.info(`request apiDetail: ${JSON.stringify(data, null, 2)}`)

  return data
}

export async function genRequestCode(api: YapiApiData) {
  const apiDetail = await getApiDetail(api)

  logger.info(`getApiDetail: ${JSON.stringify(apiDetail, null, 2)}`)

  return `
  `
}

export async function genTypeScriptTypes(api: YapiApiData) {
  const apiDetail = await getApiDetail(api)

  logger.info(`getApiDetail: ${JSON.stringify(apiDetail, null, 2)}`)

  return `
  `
}
