# brent

This monorepo includes a basic `pb-manage` CLI for working with PocketBase.

## Usage

Install dependencies and run commands via `node pb-manage/bin/pb-manage.js`.
Global flags:
`--config <file>` – path to `pb.config.json`
`--ssh-key <file>` – SSH key to use for remote commands
`--env <name>` – default environment for env-related commands

Available commands:

- `init` – scaffold config and Docker files
- `dev` – start the local Docker environment, run migrations and seeds, and stream logs
- `migrate` – run migrations in the local container
- `seed` – seed the local database
- `create <env>` – create a remote environment (requires `pb.config.json`)
- `destroy <env>` – remove a remote environment
- `backup <env>` – zip the remote data directory
- `restore <env> <file>` – restore a backup on the remote server
- `deploy <env>` – create and apply migrations & seeds

