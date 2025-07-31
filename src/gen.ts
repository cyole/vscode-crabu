import type { ApiDetailRaw, YapiApiItem } from './types'
import { crabuApiBaseUrl } from './constants/api'
import { ofetch } from './utils'

function generateTsTypeCode(node: any, records: string[], depth = 0): string {
  let res = ''

  let name = (node as any).tname?.split('/').pop()
  name = name?.split('(')?.[0]
  if (name) {
    name = name[0].toUpperCase() + name.slice(1)
    res += `type ${name} = `

    if (node.type === 'Array') {
      depth -= 1
    }
  }
  if (node.type === 'Object') {
    res += '{\n'

    if (!name) {
      depth += 1
    }

    for (const child of node.children) {
      if (child.type === 'Property') {
        res += child.comment ? `${'    '.repeat(depth + 1)}/** ${child.comment} */\n` : ''
        const key = child.key.value
        const type = generateTsTypeCode(child.value, records, depth)
        const required = child.required ? '' : '?'
        res += `${'    '.repeat(depth + 1)}${key}${required}: ${type};\n`
      }
    }
    res += `${'    '.repeat(depth)}}`

    if (name) {
      records.push(res)
      return name
    }
  }
  else if (node.type === 'Array') {
    res += generateTsTypeCode(node.children[0], records, depth)
    res += '[]'
  }
  else {
    if (node.value === 'integer') {
      res += 'number'
    }
    else {
      res += node.value ? node.value.toString() : 'unknown'
    }
  }

  return res
}

export function genreateRequestCode(tags: string[], path: string, ns: string, reqType?: string, resType?: string) {
  const reqTypeName = /^type (.+) =/.exec(reqType ?? '')?.[1] ?? reqType
  const resTypeName = /^type (.+) =/.exec(resType ?? '')?.[1] ?? resType
  const funcName = path.split('/').pop()!
  const paths = path.split('/')
  paths.splice(1, 1)

  return `
/** ${tags.join(' - ')} */
export function ${funcName}(${reqTypeName ? `params: ${ns ? `${ns}.` : ''}${reqTypeName}` : ''}) {
  return request.post<${ns && resTypeName ? `${ns}.` : ''}${resTypeName ?? 'void'}>('${paths.join('/')}'${reqTypeName ? `, params` : ''});
}`
}

async function getApiDetail(api: YapiApiItem) {
  const info = await ofetch<ApiDetailRaw>(`${crabuApiBaseUrl}/interface/raw/${api.project_id}/${api._id}`)

  return info
}

export async function genCode(api: YapiApiItem, ns: string) {
  const apiDetail = await getApiDetail(api)
  const { tags, path, req_body, res_body } = apiDetail

  const reqTypes: string[] = []

  if (req_body) {
    req_body.tname = req_body.tname ?? `${path}Req`

    const str = generateTsTypeCode(req_body, reqTypes)
    if (str && reqTypes.length === 0) {
      reqTypes.push(str)
    }
  }

  let resTypes: string[] = []

  const data = res_body.children.find((node: any) => node.key.value === 'data').value
  if (data) {
    if (data.type !== 'Literal') {
      data.tname = data.tname ?? `${path}Res`
    }

    const str = generateTsTypeCode(data, resTypes)

    if (str && resTypes.length === 0) {
      resTypes.push(str)
    }
  }
  resTypes = resTypes.filter(item => item.startsWith('type '))

  const requestCode = genreateRequestCode(tags, path, ns, reqTypes.slice(-1)[0], resTypes.slice(-1)[0] === 'null' ? undefined : resTypes.slice(-1)[0])

  return {
    requestCode,
    typesCode: `
    ${reqTypes.join('\n')}
    
    ${resTypes.join('\n')}
`,
  }
}
