#!/usr/bin/env node

import program from 'commander';
import pkg from '../package.json';

program
  .version(pkg.version)
  .command('init', 'create project from templates')
  .command('ls', 'list templates installed')
  .command('add', 'add template')
  .command('del', 'delete template')
  .parse(process.argv);
