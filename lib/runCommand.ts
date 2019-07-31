import { spawn } from 'child_process';

export default function(cmd: string, args: string[], options: { [prop: string]: any }) {
  return new Promise((resolve, reject) => {
    const s = spawn(cmd, args, {
      stdio: 'inherit',
      ...options
    });
    s.on('exit', () => {
      resolve();
    });
    s.on('error', () => {
      reject();
    });
  });
}
