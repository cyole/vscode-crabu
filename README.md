# Crabu

A VS Code extension for managing and generating code from YAPI APIs.

<a href="https://marketplace.visualstudio.com/items?itemName=cyole.crabu" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/cyole.crabu.svg?color=eee&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>
<a href="https://kermanx.github.io/reactive-vscode/" target="__blank"><img src="https://img.shields.io/badge/made_with-reactive--vscode-%23007ACC?style=flat&labelColor=%23229863"  alt="Made with reactive-vscode" /></a>

## Configurations

<!-- configs -->

| Key                        | Description     | Type      | Default                  |
| -------------------------- | --------------- | --------- | ------------------------ |
| `crabu.yapiBaseUrl`        | yapi文档的baseUrl  | `string`  | `""`                     |
| `crabu.yapiProjects`       | yapi项目列表        | `array`   | `[]`                     |
| `crabu.annotations`        | 是否开启接口注解        | `boolean` | `true`                   |
| `crabu.annotationColor`    | 接口注解的颜色         | `string`  | `"#9D5BF4"`              |
| `crabu.crabuServerBaseUrl` | Crabu服务的baseUrl | `string`  | `"http://localhost/api"` |

<!-- configs -->

## Commands

<!-- commands -->

| Command                           | Title                                |
| --------------------------------- | ------------------------------------ |
| `crabu.launch`                    | Crabu: Launch Crabu                  |
| `crabu.refreshApiTreeView`        | Crabu: Refresh API Tree View         |
| `crabu.refreshMockTreeView`       | Crabu: Refresh Mock Tree View        |
| `crabu.searchApi`                 | Crabu: Search API                    |
| `crabu.searchApiGroup`            | Crabu: Search API Group              |
| `crabu.showCrabuWebview`          | Crabu: Show Crabu Webview            |
| `crabu.getApiTreeDataUpdateTime`  | Crabu: Get API Tree Data Update Time |
| `crabu.switchMockStatus`          | Crabu: Switch Mock Status            |
| `crabu.addApiToMock`              | Add API to Mock                      |
| `crabu.addApiToMockByUrl`         | Crabu: Add API to Mock by Yapi Url   |
| `crabu.addApiGroupToMock`         | Add API Group to Mock                |
| `crabu.removeFromMock`            | Remove API from Mock                 |
| `crabu.showCrabuWebviewWithMock`  | Show Crabu Webview with Mock         |
| `crabu.updateMockToLatestVersion` | Update Mock to Latest Version        |
| `crabu.genBusinessCode`           | Generate Business Code               |
| `crabu.compareWithLatestVersion`  | Compare with Latest Version          |
| `crabu.copyApiPath`               | Copy API Path                        |
| `crabu.aiGenerateMock`            | AI Generate Mock                     |
| `crabu.updateAiQueueStatus`       | Crabu: Update AI Queue Status        |
| `crabu.findInApi`                 | Crabu: Find in API                   |
| `crabu.findInMock`                | Crabu: Find in Mock                  |
| `crabu.updateCrabuMockStatus`     | Crabu: Update Crabu Mock Status      |
| `crabu.refreshAiQueueTreeView`    | Crabu: Refresh AI Queue Tree View    |
| `crabu.cancelAiTask`              | Cancel AI Task                       |

<!-- commands -->

## License

[MIT](./LICENSE.md) License © 2025 [Cyole](https://github.com/cyole)
