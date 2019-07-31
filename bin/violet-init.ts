#!/usr/bin/env node

import program from 'commander';
import glob from 'glob';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import logSymbols from 'log-symbols';
import rm from 'rimraf';
import templateConfig from '../config/template.json';
import { pkgManagerPrompt } from '../config';
import { download, generator, sortObject, runCommand, log, checkVersion } from '../lib';

// 模板的配置文件
const META_FILE_NAME = 'meta.js';

program.usage('<project-name>').parse(process.argv);
// 根据输入，获取项目名称
let projectName = program.args[0];

// project-name 必填
if (!projectName) {
  // 相当于执行命令的--help选项，显示help信息，这是commander内置的一个命令选项
  program.help();
  process.exit(-1);
}

main();

async function main() {
  await checkVersion();
  let projectRootDir: string; // 项目根文件夹名称
  let templateSourceURL: string; // 模板源 git 地址
  let templateTempPath: string; // 模板暂时存放的路径
  try {
    // 获取需要新建的项目文件夹名称
    projectRootDir = await checkDir(projectName);
    // 创建目录
    makeDir(projectRootDir);
    // 选择模板
    templateSourceURL = await selectTemplate();
    // 下载模板
    templateTempPath = await download(templateSourceURL, projectRootDir);
    // 获取模板自定义问答配置
    const prompts = await getTemplatePrompts(templateTempPath, META_FILE_NAME);
    // 是否为静态模板 无模板配置
    const isStaticTemplate = prompts.length === 1;
    // 进行模板问答
    const { pkgManager, ...answers } = await inquirer.prompt(prompts);
    if (isStaticTemplate) {
      // 如果是静态模板
      // 直接将临时文件转移至项目文件夹 而后删除临时文件
      fs.copySync(templateTempPath, resolvePath(projectRootDir));
      if (fs.existsSync(templateTempPath)) {
        rm.sync(templateTempPath);
      }
    } else {
      // 否则为动态模板 存在模板配置 结合问答渲染最终文件
      await generator(answers, templateTempPath, projectRootDir);
      // 排序依赖
      sortDependencies(resolvePath(projectRootDir, 'package.json'));
    }
    // 初始化git
    await runCommand('git', ['init'], { cwd: resolvePath(projectRootDir) });
    // 安装依赖
    const isInstallSuccess = await installDependencies(pkgManager, resolvePath(projectRootDir));
    // 创建成功后的回调
    afterBuildSuccess(projectRootDir, pkgManager, isInstallSuccess);
  } catch (error) {
    afterBuildError(projectRootDir, templateTempPath, error);
  }
}

/**
 * 判断当前目录环境是否与项目名有冲突
 * 获取项目目录地址
 * @param projectName 用户输入的项目名称
 */
async function checkDir(projectName: string): Promise<string> {
  return new Promise(async (resolve, reject) => {
    // 遍历当前目录
    const list = glob.sync('*');

    let rootName = path.basename(process.cwd());

    // 如果当前目录不为空
    if (list.length) {
      const existSameNameDirs = list.filter(name => {
        // 完整路径
        const fileName = resolvePath(path.join('.', name));
        const isDir = fs.statSync(fileName).isDirectory();
        return path.basename(fileName) === projectName && isDir;
      });
      const existSameNameDirsCount = existSameNameDirs.length;
      // 当前目录下存在同名目录
      if (existSameNameDirsCount) {
        reject(new Error(`项目${projectName}已经存在`));
      } else {
        // 在本目录内新建项目文件夹
        resolve(projectName);
      }
    } // 当前目录为空 且目录名与项目名相同 询问是否将本目录作为项目根目录
    else if (rootName === projectName) {
      const { buildInCurrent } = await inquirer.prompt([
        {
          name: 'buildInCurrent',
          message: '当前目录为空，且目录名称和项目名称相同，是否直接在当前目录下创建新项目？',
          type: 'confirm',
          default: true
        }
      ]);
      resolve(buildInCurrent ? '.' : projectName);
    }
    // 当前目录为空 且目录名不为项目名 则在本目录内新建项目文件夹
    else {
      resolve(projectName);
    }
  });
}

/**
 * 创建目录
 */
function makeDir(projectRootDir: string) {
  // 如果不是在当前同名目录下 就新建一个目录
  if (projectRootDir !== '.') {
    fs.mkdirSync(projectRootDir);
  }
}

/**
 * 选择项目模板
 */
function selectTemplate(): Promise<string> {
  return new Promise(async (resolve, reject) => {
    const { templateURL } = await inquirer.prompt({
      name: 'templateURL',
      type: 'list',
      message: '请选择模板类型',
      choices: templateConfig
    });
    resolve(templateURL);
  });
}

/**
 * 获取模板自定义问答
 * @param templateTempPath 模板路径
 * @param fileName 模板配置文件名称
 */
function getTemplatePrompts(templateTempPath: string, fileName = META_FILE_NAME): Promise<any[]> {
  // 插入一个npm包管理的内置问答
  const pkgManager = {
    name: 'pkgManager',
    type: 'list',
    message: '请选择包管理工具',
    choices: pkgManagerPrompt
  };
  return new Promise((resolve, reject) => {
    const filePath = resolvePath(templateTempPath, fileName);
    if (fs.existsSync(filePath)) {
      const templatePrompts = require(filePath);
      const prompts = [...templatePrompts, pkgManager];
      resolve(prompts);
    } else {
      resolve([pkgManager]);
    }
  });
}

/**
 * 整理 dependencies 排序
 * @param pkgPath package.json的路径
 */
function sortDependencies(pkgPath: string) {
  const pkg = require(pkgPath);
  pkg.dependencies = sortObject(pkg.dependencies);
  pkg.devDependencies = sortObject(pkg.devDependencies);
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

/**
 *
 * @param pkgManager 包管理工具 yarn or npm or false
 */
async function installDependencies(
  pkgManager: string | boolean,
  projectPath: string
): Promise<boolean> {
  return new Promise(async resolve => {
    if (pkgManager !== false) {
      try {
        if (pkgManager === 'yarn') {
          await runCommand('yarn', [], { cwd: projectPath });
          resolve(true);
        }
        if (pkgManager === 'npm') {
          await runCommand('npm', ['install'], { cwd: projectPath });
          resolve(true);
        }
      } catch (error) {
        console.warn(logSymbols.error, chalk.red(`依赖安装失败：${error.message}`));
        log.warn('请手动安装依赖');
        resolve(false);
      }
    } else {
      resolve(false);
    }
  });
}
/**
 * 创建成功后的处理
 * @param projectRootDir 项目根文件夹名称
 */
function afterBuildSuccess(
  projectRootDir: string,
  pkgManager: string | boolean,
  isInstallSuccess: boolean
) {
  console.log();
  console.log(logSymbols.success, chalk.green('项目创建成功'), '🎉');
  console.log();
  console.log('===================================');
  console.log();
  if (projectRootDir !== '.') {
    log.info(`cd ${projectRootDir}`);
  }
  if (!isInstallSuccess) {
    if (pkgManager === 'yarn') {
      log.info('yarn');
    }
    if (pkgManager === 'npm') {
      log.info('npm i');
    }
    if (pkgManager === false) {
      log.info('install dependencies by yourself');
    }
  }
  if (pkgManager === false) {
    log.info('npm start');
  } else {
    log.info(`${pkgManager} start`);
  }
  console.log();
  console.log('===================================');
  console.log();
  console.log('Done. ✨');
}

/**
 * 创建失败后的处理
 * @param projectRootDir 项目根文件夹名称
 * @param templateTempPath 模板路径
 */
function afterBuildError(projectRootDir: string, templateTempPath: string, error: Error) {
  console.error(logSymbols.error, chalk.red(`创建失败：${error.message}`));
  if (fs.existsSync(projectRootDir)) {
    rm.sync(projectRootDir);
  }
  if (fs.existsSync(templateTempPath)) {
    rm.sync(templateTempPath);
  }
}

function resolvePath(...args: string[]) {
  return path.resolve(process.cwd(), ...args);
}
