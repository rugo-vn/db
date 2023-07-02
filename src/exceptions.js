export class ValidationError extends Error {
  constructor(ecpt) {
    let message;

    if (ecpt.name === 'ValidationError' && ecpt.errors) {
      ecpt.code = 20000;
    }

    switch (ecpt.code) {
      case 11000: // duplicate error
        const keyValues = Object.keys(ecpt.keyValue);
        message = keyValues
          .map(
            (name) =>
              `Duplicate value (${JSON.stringify(
                ecpt.keyValue[name]
              )}) on path \`${name}\``
          )
          .join(', ');
        break;
      case 20000:
        message = Object.keys(ecpt.errors)
          .map((name) => ecpt.errors[name].properties.message)
          .join(' ');
        break;
    }

    super(message);
    this.name = 'ValidationError';
    this.data = { ...ecpt };
  }
}
