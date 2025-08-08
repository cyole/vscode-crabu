import type { CommentJSONValue } from 'comment-json'

export interface FetchResponse<T> {
  data: T
  errcode: number
  errmsg: string
}

export interface YapiApiItem {
  title: string
  path: string
  method: string
  _id: string
  catid: string
  project_id: number
  project_token?: string
}

export interface YapiMenuData {
  name: string
  desc?: string
  list: YapiApiItem[]
}

export interface MockApiData {
  label: string
  key: string
  children?: MockApiData[]
}

export interface ApiReq {
  name: string
  type: string
  example: string
  desc: string
  required: '0' | '1'
}

export interface ApiReqParams {
  name: string
  example: string
  desc: string
}

export interface ApiReqHeader {
  name: string
  type: string
  example: string
  desc: string
  required: '0' | '1'
}

export interface ApiReqQuery {
  name: string
  example: string
  desc: string
}

export interface YApiDetail {
  /** id */
  _id: string
  /** 项目id */
  project_id: number
  /** 品类id */
  catid: string
  /** 接口名称 */
  title: string
  /** 请求路径 */
  path: string
  /** 请求method */
  method: string
  /** 请求数据类型 枚举: raw,form,json */
  req_body_type: string
  /** 返回数据 */
  res_body: string
  /** 返回数据类型 枚举: json,raw */
  res_body_type: string
  /** 用户uid */
  uid: number
  /** 添加时间 */
  add_time: number
  /** 更新时间 */
  up_time: number
  /** 请求 form 参数 */
  req_body_form: ApiReq[]
  /** 请求 params 参数 */
  req_params: ApiReqParams[]
  /** 请求 header 参数 */
  req_headers: ApiReqHeader[]
  /** 请求 query 参数 */
  req_query: ApiReq[]
  /** 接口状态 */
  status: 'done' | 'undone'
  /** 修改的用户uid */
  edit_uid: number
  /** 返回数据是否为 json-schema */
  res_body_is_json_schema: boolean
  /** 接口标签 */
  tag: string[]
}

export interface ApiDetail {
  path: string
  tags?: string[]
  req_body?: string | CommentJSONValue
  res_body?: string | CommentJSONValue
}

export interface ApiDetailRaw {
  path: string
  tags: string[]
  req_body: any
  res_body: any
}
