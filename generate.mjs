// 在根目录中创建一个 `gen.conf` 目录
// 该配置文件将决定生成内容
/**
 * id: 标识符(英文!!)
 * name: 名称
 * logo: 图标, 最好在根目录, 格式为png
 * desc: 介绍
 * workdir: 音频目录
 */

import fs from 'fs'
import { join } from 'path'
import path from 'path'

const kPackFilename = 'pack.json'
const kGenconfFilename = 'gen.conf'

const kCurrentWorkspace = process.cwd()

function copyFileSync(source, target) {

  var targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, targetFolder) {
  var files = [];

  // Check if folder needs to be created or integrated
  // var targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      var curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg
// Parser src into an Object
function parse(src) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/mg, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = (match[2] || '')

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}

function readConfig() {
  if (!fs.existsSync(kGenconfFilename)) {
    console.log('配置文件不存在')
    process.exit(0)
  }
  const confData = fs.readFileSync(kGenconfFilename).toString('utf-8')
  const conf = parse(confData)
  const id = conf['id']
  const name = conf['name']
  const logo = conf['logo']
  const desc = conf['desc']
  const workdir = conf['workdir']

  if (!id || !name || !logo || !workdir) {
    console.log('配置key不存在 id | name | logo | workdir')
    process.exit(0)
  }

  if (!fs.existsSync(workdir)) {
    console.log('资源目录不存在')
    process.exit(0)
  }
  return {
    id,
    name,
    logo,
    desc,
    workdir,
  }
}

function autoGenPackData(ctx, autoSave = false) {
  const { id, name, logo } = ctx
  /**
   * @type {Array<any>}
   */
  const data = JSON.parse(fs.readFileSync(kPackFilename).toString('utf-8'))
  data.push({
    id,
    name,
    logo,
  })
  if (autoSave) {
    fs.writeFileSync(kPackFilename, JSON.stringify(data))
  }
  return data
}

function autoGenSoundData(ctx, logo, autoSave = false) {
  const { workdir, id } = ctx
  const path = join(kCurrentWorkspace, workdir)
  const data = {
    desc: ctx.desc,
    id,
    logo,
    name: ctx.name,
    data: [],
  }
  fs.readdirSync(path).map(file=> {
    const title = file.split('.')[0]
    data.data.push({
      title,
      sound: file,
    })
  })
  if (autoSave) {
    const soundWithPath = join(kCurrentWorkspace, 'data', `${id}.json`)
    fs.writeFileSync(soundWithPath, JSON.stringify(data))
  }
  return data
}

function autoCopyLogo(ctx) {
  const { logo, id } = ctx
  const workFile = join(kCurrentWorkspace, logo)
  const exts = ['png', 'jpg']
  const ext = logo.split('.').pop()
  if (!exts.includes(ext)) {
    console.log('图标格式不正确, 只支持 png/jpg')
    process.exit('0')
  }
  const filename = `${id}.${ext}`
  const targetPath = join(kCurrentWorkspace, 'logos', filename)
  if (!fs.existsSync(workFile)) {
    console.log('图标文件不存在')
    process.exit(0)
  }
  copyFileSync(workFile, targetPath)
  return filename
}

function autoCopySounds(ctx) {
  const { workdir, id } = ctx
  const targetPath = join(kCurrentWorkspace, 'sounds', id)
  const sourcePath = join(kCurrentWorkspace, workdir)
  copyFolderRecursiveSync(sourcePath,targetPath)
}

function main() {
  const configKV = readConfig()
  autoGenPackData(configKV, true)
  const logoFileSyb = autoCopyLogo(configKV)
  autoGenSoundData(configKV, logoFileSyb, true)
  autoCopySounds(configKV)
}

;(async()=> {
  main()
})();