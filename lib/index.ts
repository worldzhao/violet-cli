export { default as download } from './download';

export { default as generator } from './generator';

export { default as runCommand } from './runCommand';

export { default as log } from './log';

export { default as checkVersion } from './checkVersion';

export function sortObject(obj: { [prop: string]: string }) {
  const sortedObject: { [prop: string]: string } = {};
  Object.keys(obj)
    .sort()
    .forEach(item => {
      sortedObject[item] = obj[item];
    });
  return sortedObject;
}
