import { RugoException } from '@rugo-vn/exception';
import { mergeAll, update } from 'ramda';
import { count } from './actions.js';
import { DEFAULT_LIMIT, NOT_REQURIED_SCHEMA } from './constants.js';
import { aliasId } from './utils.js';

import * as actions from './actions.js';

export const before = {
  async all(args) {
    const { spaceId, tableName } = args;
    const name = spaceId && tableName ? `${spaceId}.${tableName}` : null;
    args.name = name;
  },

  setSchema: ['prepareModel'],
  restore: ['prepareModel'],

  find: [
    async function (args) {
      let { limit, skip, page } = args;

      // default limit
      limit = parseInt(limit);
      if (isNaN(limit)) {
        limit = DEFAULT_LIMIT;
      }

      // pagination: start from 1
      page = parseInt(page);
      skip = parseInt(skip);
      if (limit === -1) {
        page = 1;
      } else if (limit === 0) {
        page = 0; // no pagination
      } else {
        const skipPage = Math.floor((skip || 0) / limit) + 1;
        if (!isNaN(page) && skipPage !== page) {
          // page priority
          skip = (page - 1) * limit;
        } else {
          page = skipPage;
        }
      }

      // default skip
      skip ||= 0;

      if (limit === -1) {
        delete args.limit;
      } else {
        args.limit = limit;
      }

      args.skip = skip;
    },
  ],

  update: [
    async function (args) {
      args.set ||= {};
      args.inc ||= {};

      args.set.updatedAt = new Date().toISOString();
      args.inc.version = 1;
    },
  ],
};

for (const name in actions) {
  before[name] ||= [];
  if (NOT_REQURIED_SCHEMA.indexOf(name) === -1) {
    before[name].unshift('isSchema');
    before[name].unshift('prepareModel');
  }
}

export const after = {
  async find(data, args) {
    const total = await count.bind(this)(args);

    let { skip, page } = args;
    const limit = args.limit === undefined ? -1 : args.limit;

    // over skip
    if (skip > total) {
      skip = total;
    }

    // total page
    let npage;
    if (limit === -1) {
      npage = 1;
    } else if (limit === 0) {
      npage = 0;
    } else {
      npage = Math.floor(total / limit) + (total % limit === 0 ? 0 : 1);
    }

    if (limit === -1) {
      page = 1;
    } else if (limit === 0) {
      page = 0; // no pagination
    } else {
      const skipPage = Math.floor((skip || 0) / limit) + 1;
      if (!isNaN(page) && skipPage !== page) {
        // page priority
        skip = (page - 1) * limit;
      } else {
        page = skipPage;
      }
    }

    // over skip > page
    if (skip === total) {
      page = npage;
    }

    return {
      data: data.map(aliasId),
      meta: {
        limit,
        total,
        skip,
        page,
        npage,
      },
    };
  },

  ...mergeAll(
    ['get', 'create', 'update', 'remove'].map((name) => ({ [name]: aliasId }))
  ),
};
