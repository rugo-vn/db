import { exec } from '@rugo-vn/service';
import { basename, join } from 'path';
import rimraf from 'rimraf';
import temp from 'temp';

export const cleanSchema = (keyword, value, tracks) => {
  if (keyword === 'default') {
    return undefined;
  }

  if (keyword === 'format') return undefined;

  if (
    ['_id', 'createdAt', 'updatedAt'].indexOf(tracks[tracks.length - 1]) !== -1
  )
    return undefined;

  return { [keyword]: value };
};

export const aliasId = (doc) => {
  if (!doc) {
    return;
  }
  doc = doc.toObject();
  doc.id = doc._id;
  delete doc._id;
  return doc;
};

export const mongodump = async ({ uri, collection, path, fileName }) => {
  const tmpPath = temp.path({ prefix: 'rugo-' });

  await exec(`mongodump --uri="${uri}" -c "${collection}" -o "${tmpPath}"`);
  await exec(
    `cd "${tmpPath}/${basename(uri)}" && mv "${collection}.bson" "${join(
      path,
      fileName
    )}"`
  );

  rimraf.sync(tmpPath);
};

export const mongorestore = async ({ uri, collection, dumpFile }) => {
  const tmpPath = temp.path({ suffix: '.bson', prefix: 'rugo-' });

  await exec(
    `cp "${dumpFile}" "${tmpPath}" && mongorestore --uri="${uri}" --collection="${collection}" "${tmpPath}" --drop`
  );

  rimraf.sync(tmpPath);
};

export const generateCollectionName = function (spaceId, tableName) {
  if (!spaceId || !tableName) return null;

  return `${spaceId}.${tableName}`;
};
