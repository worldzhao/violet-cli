import originDownload from 'download-git-repo';
import ora from 'ora';
import path from 'path';
import { promisify } from 'util';

const download = promisify(originDownload);

/**
 * 下载远程模板
 * @param templateSourceURL 模板源 git地址
 * @param target  存放模板临时文件夹的地方
 */
export default function(templateSourceURL: string, target: string = '.') {
  const downloadTempPath = path.join(target, '.download-temp');
  // 这里可以根据具体的模板地址设置下载的url，注意，如果是git，url后面的branch不能忽略
  const spinner = ora(`正在下载项目模板，源地址：${templateSourceURL}`);
  spinner.start();
  return download(`direct:${templateSourceURL}`, downloadTempPath, { clone: true })
    .then(() => {
      spinner.succeed();
      return downloadTempPath;
    })
    .catch((error: Error) => {
      spinner.fail();
      return Promise.reject(error);
    });
}
