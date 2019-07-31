import Handlebars from 'handlebars';
import Metalsmith from 'metalsmith';
import path from 'path';
import rm from 'rimraf';
import chalk from 'chalk';
import fs from 'fs-extra';
import minimatch from 'minimatch';

const IGNORE_FILE_NAME = '.filesignore';

/**
 * 生成最终的项目文件
 * @param data 模板问答结果
 * @param src  模板地址
 * @param dest 生成文件地址
 */
export default function(data: object, src: string, dest: string = '.') {
  if (!src) {
    return Promise.reject(new Error(`无效的source：${src}`));
  }
  return new Promise((resolve, reject) => {
    const realSrc = path.join(src, './template');
    const ignoreFile = path.join(src, IGNORE_FILE_NAME);
    const metalsmith = Metalsmith(process.cwd())
      .metadata(data)
      .clean(false)
      .source(realSrc)
      .destination(dest);
    // 判断下载的项目模板中是否有.filesignore文件
    if (fs.existsSync(ignoreFile)) {
      // 定义一个用于移除模板中被忽略文件的metalsmith插件
      metalsmith.use((files, metalsmith, done) => {
        const meta = metalsmith.metadata();
        // 先对ignore文件进行渲染，然后按行切割ignore文件的内容，拿到被忽略清单
        const ignores = Handlebars.compile(fs.readFileSync(ignoreFile).toString())(meta)
          .split('\n')
          .filter(item => !!item.length);
        Object.keys(files).forEach(fileName => {
          // 移除被忽略的文件
          ignores.forEach(ignorePattern => {
            if (minimatch(fileName, ignorePattern)) {
              delete files[fileName];
            }
          });
        });
        done(undefined, files, metalsmith);
      });
    }

    metalsmith
      .use((files, metalsmith, done) => {
        const meta = metalsmith.metadata();
        Object.keys(files).forEach(fileName => {
          try {
            const t = files[fileName].contents.toString();
            files[fileName].contents = new Buffer(Handlebars.compile(t)(meta));
          } catch (error) {
            console.error(chalk.red(`render file error: ${fileName}`));
          }
        });
        done(undefined, files, metalsmith);
      })
      .build((error: Error) => {
        rm.sync(src);
        error ? reject(error) : resolve();
      });
  });
}
