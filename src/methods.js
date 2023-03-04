import { NotFoundError, RugoException } from '@rugo-vn/exception';
import { ObjectId } from 'mongodb';

export const prepareModel = async function (args) {
  const { name } = args;
  if (!name) {
    throw new RugoException('spaceId and tableName is required');
  }
  args.model = this.registers[name];
  args.collectionName = args.model?.collection.collectionName;
};

export const isSchema = async function ({ name, spaceId, tableName }) {
  if (!this.registers[name]) {
    throw new NotFoundError(
      `Table "${tableName}" is not found in "${spaceId}"`
    );
  }
};

export const buildQuery = function ({ filters = {} }) {
  if (filters._id) {
    filters._id = ObjectId(filters._id);
  }
  if (filters.id) {
    filters._id = ObjectId(filters.id);
  }

  delete filters.id;

  return filters;
};
