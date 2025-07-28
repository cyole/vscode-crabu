import type { ApiDetail, YapiApiItem } from './types'
import { config } from './config'
import { apiDetail } from './constants/api'
import { logger, request } from './utils'

function genreateTsCode(tags: string[], path: string, reqType?: string, resType?: string) {
  const reqTypeName = /^type (.+) =/.exec(reqType ?? '')?.[1] ?? reqType
  const resTypeName = /^type (.+) =/.exec(resType ?? '')?.[1] ?? resType
  const funcName = path.split('/').pop()!
  const paths = path.split('/')
  paths.splice(1, 1)

  return `/** ${tags.join(' - ')} */
export function ${funcName}(${reqTypeName ? `params: ${reqTypeName}` : ''}) {
  return request.post<${resTypeName ?? 'void'}>('${paths.join('/')}'${reqTypeName ? `, params` : ''});
}`
}

async function getApiDetail(api: YapiApiItem) {
  const token = api.project_token ?? config.yapiProjects.find(project => project.id === api.project_id)?.token ?? ''
  const data = await request<ApiDetail>(`${config.yapiBaseUrl}${apiDetail}`, {
    id: api._id,
    token,
  })

  logger.info(`request apiDetail: ${JSON.stringify(data, null, 2)}`)

  return data
}

export async function genRequestCode(api: YapiApiItem) {
  const apiDetail = await getApiDetail(api)
  const tsCode = genreateTsCode(apiDetail.tag, apiDetail.path, apiDetail.req_body_type, apiDetail.res_body_type)

  return tsCode
}

export async function genTypeScriptTypes(api: YapiApiItem) {
  const apiDetail = await getApiDetail(api)

  logger.info(`getApiDetail: ${JSON.stringify(apiDetail, null, 2)}`)

  return `
  `
}
