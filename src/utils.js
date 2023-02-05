import { exec } from '@rugo-vn/service';
import { basename, join } from 'path';
import rimraf from 'rimraf';
import temp from 'temp';

export const removeDefault = (keyword, value) => {
  if (keyword === 'default') { return undefined; }
  return { [keyword]: value };
};

export const aliasId = doc => {
  if (!doc) { return; }
  doc.id = doc._id;
  delete doc._id;
  return doc;
};

export const mongodump = async ({ uri, collection, path, fileName }) => {
  const tmpPath = temp.path({ prefix: 'rugo-' });

  await exec(`mongodump --uri="${uri}" -c "${collection}" -o "${tmpPath}"`);
  await exec(`cd "${tmpPath}/${basename(uri)}" && mv "${collection}.bson" "${join(path, fileName)}"`);

  rimraf.sync(tmpPath);
};

export const mongorestore = async ({ uri, collection, dumpFile }) => {
  const tmpPath = temp.path({ suffix: '.bson', prefix: 'rugo-' });

  await exec(`cp "${dumpFile}" "${tmpPath}" && mongorestore --uri="${uri}" --collection="${collection}" "${tmpPath}" --drop`);

  rimraf.sync(tmpPath);
};
