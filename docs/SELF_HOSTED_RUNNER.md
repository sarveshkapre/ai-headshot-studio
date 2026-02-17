# Self-Hosted GitHub Actions Runner

This repo is configured to run GitHub Actions jobs on `self-hosted` runners only.

## Runner host requirements (Linux recommended)

- OS: Linux x64/arm64 (Ubuntu 22.04+ recommended)
- Tools:
  - `bash`
  - `curl`
  - `git`
  - `make`
  - `tar`
  - `python3` (>= 3.11) and `python3-venv`
- Network egress to:
  - `github.com`
  - `api.github.com`
  - `*.actions.githubusercontent.com`
- Optional:
  - `docker` (useful for local workflow emulation with `act` or future container jobs)

You can verify local prerequisites with:

```bash
./scripts/verify_self_hosted_runner.sh
```

## Register runner under this repository

1. Open repository Settings.
2. Go to `Actions` -> `Runners`.
3. Click `New self-hosted runner`.
4. Choose your platform (for example: Linux x64).
5. Run the exact commands shown in GitHub UI on your runner host.

Typical Linux flow (use the version/token from the UI):

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-<version>.tar.gz -L <download-url-from-ui>
tar xzf ./actions-runner-linux-x64-<version>.tar.gz
./config.sh --url https://github.com/sarveshkapre/ai-headshot-studio --token <token-from-ui> --unattended --name ai-headshot-studio-runner --labels self-hosted,linux
sudo ./svc.sh install
sudo ./svc.sh start
```

## Validate CI steps locally on the runner host

Run the same commands used by workflows:

```bash
make runner-prereqs
make check
make smoke
make build
make secret-scan
```

If all commands pass, the self-hosted runner is ready for this repository.
