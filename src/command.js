// @flow

import { ArgumentParser } from 'argparse';
import serverMain from './server';


const parser = new ArgumentParser({
  version: '0.0.1',
  addHelp: true,
  description: 'Argparse examples: sub-commands',
});

const subparsers = parser.addSubparsers({
  title: 'subcommands',
  dest: 'subcommand_name',
});

const serveParser = subparsers.addParser('serve', { addHelp: true });
serveParser.addArgument(
  ['-p', '--port'],
  {
    action: 'store',
    type: 'int',
    defaultValue: 4444,
    help: 'Server port to bind to',
  },
);
serveParser.addArgument(
  ['path'],
  {
    action: 'store',
    nargs: '?',
    defaultValue: '.',
    help: 'HTML dir to serve',
  },
);
serveParser.addArgument(
  ['-r', '--rules'],
  {
    action: 'store',
    defaultValue: null,
    help: 'load rules',
  },
);
serveParser.addArgument(
  ['--db'],
  {
    action: 'store',
    dest: 'dbName',
    defaultValue: 'example',
    help: 'Name of database to use',
  },
);

subparsers.addParser(
  'deploy',
  { addHelp: true },
);

function main() {
  const args = parser.parseArgs();

  switch (args.subcommand_name) {
    case 'serve':
      serverMain(args);
      break;
    default:
      break;
  }
}

main();
