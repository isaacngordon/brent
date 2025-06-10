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
- `create <env>` – clone the base `pb_data`, start a remote container, apply migrations and seeds, and configure nginx at `<env>.<domain>`
- `destroy <env>` – stop the container, remove its data and nginx config
- `backup <env>` – create a ZIP of the remote data directory. Use `--local` to
  download it and `--remote` to keep a copy on the server.
- `restore <env> <file>` – stop the remote container, restore the ZIP, and start
  the container again
- `deploy <env>` – create and apply migrations & seeds

