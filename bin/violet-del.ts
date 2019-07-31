import program from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { log, runCommand } from '../lib';
import templateConfig from '../config/template.json';

program.usage('<template-name>').parse(process.argv);

const [templateName] = program.args;

if (!templateName) {
  program.help();
  process.exit(-1);
}

main();

function main() {
  const isTemplateNameExist = templateConfig.some(t => t.name === templateName);
  if (!isTemplateNameExist) {
    log.error(`💣 模板 ${templateName} 不存在 无法进行删除`);
    return;
  } else {
    const newTemplateConfig = templateConfig.filter(t => t.name !== templateName);
    fs.writeFileSync(
      path.resolve(__dirname, '../config/template.json'),
      JSON.stringify(newTemplateConfig, null, 2) + '\n'
    );
    log.success(`✨ 模板 ${templateName} 删除成功`);
    runCommand('violet', ['ls'], {});
  }
}
