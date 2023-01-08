import { NotFoundError, RugoException } from "@rugo-vn/exception"

export const prepareCollection = async function(args) {
  const { name } = args;

  if (!name) {
    throw new RugoException('spaceId and tableName is required');
  }

  // create collection
  const collection = (await this.db.listCollections().toArray()).map(i => i.name).indexOf(name) === -1
    ? await this.db.createCollection(name)
    : this.db.collection(name);
    
  args.collection = collection;
}

export const isSchema = async function({ name, spaceId, tableName }) {
  if (!this.registers[name])
    throw new NotFoundError(`Table "${tableName}" is not found in "${spaceId}"`);
}