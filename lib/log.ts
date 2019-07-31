import chalk from 'chalk';

function noop(msg: string): string {
  return msg;
}

function log(fn: Function): (msg: string) => void {
  return (msg: string): void => {
    console.log(fn(msg));
  };
}

export default {
  success: log(chalk.green),
  error: log(chalk.red),
  warn: log(chalk.yellow),
  info: log(chalk.cyan),
  log: log(noop)
};
