# Brent Monorepo

This repository contains an experimental setup for running [PocketBase](https://pocketbase.io/) alongside a demo Next.js app and a minimal `pb-manage` command line tool. The CLI automates starting local containers, provisioning remote environments and deploying through GitHub Actions.

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- A VPS or server with Docker, Docker Compose and Nginx installed
- DNS records for `api.example.com` and `*.api.example.com` (replace with your domain) pointing to the server
- TLS certificates configured in Nginx (for example using Let's Encrypt)
- GitHub secrets:
  - `SSH_KEY` – private key with access to the server
  - `REGISTRY_USERNAME` and `REGISTRY_PASSWORD` – credentials for GitHub Container Registry

## Manual setup

1. Clone this repository and run `node pb-manage/bin/pb-manage.js init` to generate the initial config, Docker files and GitHub workflow.
2. Edit `pb.config.json` with your `vpsHost`, `sshUser` and root domain.
3. On the server create `~/pb_data` and (optionally) `~/pb_base/pb_data` to store PocketBase data.
4. Ensure Nginx is serving your domain and has SSL configured. The CLI will create additional vhosts for new environments.
5. Add the GitHub secrets noted above to your repository settings.

## CLI usage

Run commands with `node pb-manage/bin/pb-manage.js [options] <command>`.

Global options:
- `--config <file>` – path to a custom `pb.config.json`
- `--ssh-key <file>` – SSH key for remote commands
- `--env <name>` – default environment name
- `--template <path>` – copy files from this directory or git repo when running `init`

Commands:
- `init` – scaffold config and Docker files. Use `--template <path>` to copy a template instead
- `dev` – start the local Docker environment, apply migrations and seeds, and stream logs
- `migrate` – run migrations in the local container
- `seed` – run seeds in the local container
- `create <env>` – create a remote environment at `<env>.<domain>` and apply migrations and seeds
- `destroy <env>` – remove the remote container, its data and the Nginx config
- `backup <env>` – zip the remote data directory. Use `--local` to download and `--remote` to leave a copy on the server
- `restore <env> <file>` – restore a backup zip into the remote environment
- `pull <env>` – download a remote backup and restore it locally
- `deploy <env>` – create an environment and run migrations and seeds (used from CI)

## CI/CD

The workflow `.github/workflows/pb-deploy.yml` builds a Docker image for PocketBase and pushes it to GitHub Container Registry. It then runs `pb-manage deploy production` using the `SSH_KEY` secret. Pushes to `main` trigger this workflow.

## Development workflow

1. Run `pb-manage dev` to start PocketBase locally while developing.
2. For feature branches, create an isolated environment with `pb-manage create <branch>` and access it at `<branch>.<domain>`.
3. Deploy changes by merging to `main` – GitHub Actions will build and deploy to the `production` environment.
4. Destroy a branch environment with `pb-manage destroy <branch>` when it is no longer needed.

This approach keeps a simple lifecycle for each branch: create a preview environment, iterate, merge to `main` and then destroy the preview.
