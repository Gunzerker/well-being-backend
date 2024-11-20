import * as fs from 'fs';
import * as path from 'path';

export const readFile = () => {
  const dirContents = fs.readdirSync(__dirname);
  console.log(dirContents);

  const fileContents = fs.readFileSync(
    path.join(__dirname, 'another-file.ts'),
    {
      encoding: 'utf-8',
    },
  );

  console.log(fileContents);
};
