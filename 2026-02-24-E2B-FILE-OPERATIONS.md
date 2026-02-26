# E2B Sandbox 文件操作指南

> 参考文档：[Upload Files](https://e2b.dev/docs/filesystem/upload) | [Download Files](https://e2b.dev/docs/filesystem/download)

## 1. 上传文件到 Sandbox

使用 `sandbox.files.write()`：

### TypeScript/JavaScript

```typescript
import fs from 'fs'
import { Sandbox } from '@e2b/code-interpreter'

const sandbox = await Sandbox.create()

// 文本文件
await sandbox.files.write('/home/user/hello.txt', 'Hello, World!')

// 二进制文件（从本地读取）
const content = fs.readFileSync('/local/path/to/image.png')
await sandbox.files.write('/home/user/image.png', content)

// 批量上传
await sandbox.files.write([
  { path: '/home/user/file-a.txt', data: 'content A' },
  { path: '/home/user/file-b.txt', data: 'content B' },
])
```

`data` 支持类型：`string` | `ArrayBuffer` | `Blob` | `ReadableStream`

### Python

```python
from e2b_code_interpreter import Sandbox

sandbox = Sandbox.create()

# 文本文件
sandbox.files.write("/home/user/hello.txt", "Hello, World!")

# 二进制文件（从本地读取）
with open("local/image.png", "rb") as f:
    sandbox.files.write("/home/user/image.png", f)

# 原始字节
sandbox.files.write("/home/user/data.bin", b"\x00\x01\x02")

# 批量上传
sandbox.files.write_files([
    {"path": "/home/user/file-a.txt", "data": "content A"},
    {"path": "/home/user/file-b.txt", "data": "content B"},
])
```

`data` 支持类型：`str` | `bytes` | `IO`

## 2. 从 Sandbox 下载文件

使用 `sandbox.files.read()`：

### TypeScript/JavaScript

```typescript
// 读取文本（默认）
const text: string = await sandbox.files.read('/home/user/output.txt')
fs.writeFileSync('local/output.txt', text)

// 读取二进制
const bytes: Uint8Array = await sandbox.files.read('/home/user/image.png', {
  format: 'bytes',
})
fs.writeFileSync('local/image.png', bytes)

// 读取为 Blob
const blob: Blob = await sandbox.files.read('/home/user/file.bin', {
  format: 'blob',
})

// 读取为流（适合大文件）
const stream: ReadableStream<Uint8Array> = await sandbox.files.read(
  '/home/user/large-file.bin',
  { format: 'stream' }
)
```

`format` 可选值：`"text"`（默认）| `"bytes"` | `"blob"` | `"stream"`

### Python

```python
# 读取文本（默认）
text: str = sandbox.files.read("/home/user/output.txt")
with open("local/output.txt", "w") as f:
    f.write(text)

# 读取二进制
binary: bytearray = sandbox.files.read("/home/user/image.png", format="bytes")
with open("local/image.png", "wb") as f:
    f.write(binary)

# 读取为流（适合大文件）
stream = sandbox.files.read("/home/user/large-file.bin", format="stream")
with open("local/large-file.bin", "wb") as f:
    for chunk in stream:
        f.write(chunk)
```

`format` 可选值：`"text"`（默认）| `"bytes"` | `"stream"`

## 3. Pre-Signed URL（浏览器端直传）

适用于不暴露 API Key 的场景，需要 `{ secure: true }` 创建 sandbox。

### 上传

```typescript
const sandbox = await Sandbox.create(template, { secure: true })

const uploadUrl = await sandbox.uploadUrl('demo.txt', {
  useSignatureExpiration: 10_000, // URL 10 秒后过期
})

const form = new FormData()
form.append('file', fileContent)
await fetch(uploadUrl, { method: 'POST', body: form })
```

### 下载

```typescript
const downloadUrl = await sandbox.downloadUrl('demo.txt', {
  useSignatureExpiration: 10_000,
})

const res = await fetch(downloadUrl)
const content = await res.text()
```

## 4. 其他文件系统操作

| 操作 | JS/TS | Python |
|------|-------|--------|
| 列出目录 | `sandbox.files.list(path)` | `sandbox.files.list(path)` |
| 检查存在 | `sandbox.files.exists(path)` | `sandbox.files.exists(path)` |
| 创建目录 | `sandbox.files.makeDir(path)` | `sandbox.files.make_dir(path)` |
| 删除文件/目录 | `sandbox.files.remove(path)` | `sandbox.files.remove(path)` |
| 重命名/移动 | `sandbox.files.rename(old, new)` | `sandbox.files.rename(old, new)` |
| 监听目录变化 | `sandbox.files.watchDir(path, cb)` | `sandbox.files.watch_dir(path)` |

## 5. 注意事项

- **不支持整目录上传/下载**：需要逐个文件操作，没有一次传输整个目录树的 API。
- **默认工作目录**：sandbox 中用户主目录为 `/home/user`。
- **Pre-Signed URL** 需要以 `{ secure: true }` 创建 sandbox 才可使用。
