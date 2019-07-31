import program from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { log, runCommand } from '../lib';
import templateConfig from '../config/template.json';

program.usage('<template-name> <template-git>').parse(process.argv);

const [templateName, templateGitURL] = program.args;

if (!templateName || !templateGitURL) {
  program.help();
  process.exit(-1);
}

main();

function main() {
  const isTemplateNameExist = templateConfig.some(t => t.name === templateName);
  if (isTemplateNameExist) {
    log.error(`💣 模板 ${templateName} 已经存在`);
    return;
  } else {
    const newTemplateConfig = [{ name: templateName, value: templateGitURL }, ...templateConfig];
    fs.writeFileSync(
      path.resolve(__dirname, '../config/template.json'),
      JSON.stringify(newTemplateConfig, null, 2) + '\n'
    );
    log.success(`✨ 模板 ${templateName} 新增成功`);
    runCommand('violet', ['ls'], {});
  }
}
