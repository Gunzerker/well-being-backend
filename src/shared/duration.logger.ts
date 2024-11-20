import { Logger } from '@nestjs/common';

export const Logglet = (
  context: string,
  message: string,
  duration: number,
  logger: Logger,
) => {
  switch (context) {
    case 'log': {
      logger.log(
        String(`${message} ${'\x1b[33m'}+${String(duration).slice(0, 1)}ms`),
      );
      break;
    }
    case 'error': {
      logger.error(
        String(`${message} ${'\x1b[33m'}+${String(duration).slice(0, 1)}ms`),
      );
      break;
    }
    case 'debug': {
      logger.debug(
        String(`${message} ${'\x1b[33m'}+${String(duration).slice(0, 1)}ms`),
      );
      break;
    }
    case 'verbose': {
      logger.verbose(
        String(`${message} ${'\x1b[33m'}+${String(duration).slice(0, 1)}ms`),
      );
      break;
    }
    case 'warn': {
      logger.warn(
        String(`${message} ${'\x1b[33m'}+${String(duration).slice(0, 1)}ms`),
      );
      break;
    }
    default: {
      logger.log(
        String(`${message} ${'\x1b[33m'}+${String(duration).slice(0, 1)}ms`),
      );
      break;
    }
  }
};
