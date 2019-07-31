#!/usr/bin/env node
import { table } from 'table';
import { log } from '../lib';
import templateConfig from '../config/template.json';

main();

function main() {
  const tableHeader = ['模板名称', '模板git地址'];
  const tableBody = templateConfig.map(t => {
    return [t.name, t.value];
  });
  const data = [tableHeader, ...tableBody];
  log.info(table(data));
}
