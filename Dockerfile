# Base image with Bun preinstalled (Debian-based)
FROM oven/bun:1

# Avoid interactive prompts during apt operations
ENV DEBIAN_FRONTEND=noninteractive

# Install system packages and pipx for SAM CLI
# - git: version control
# - python3, python3-venv, python3-pip: required for pipx/venv
# - pipx: recommended installer for aws-sam-cli
# - curl, unzip, ca-certificates: common tooling used by many build scripts
# Clean apt cache to reduce image size
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		git \
		python3 \
		python3-venv \
		python3-pip \
		pipx \
		curl \
		unzip \
		ca-certificates; \
	rm -rf /var/lib/apt/lists/*

# Configure pipx to install binaries into a global, conventional path
ENV PIPX_HOME=/opt/pipx \
	PIPX_BIN_DIR=/usr/local/bin

# Install AWS SAM CLI via pipx
RUN set -eux; \
	pipx install aws-sam-cli; \
	# Show versions to verify install succeeded during image build
	bun --version; \
	git --version; \
	sam --version

# Set default working directory for Cursor-managed workspaces
WORKDIR /workspace

# The agent's runtime dependency installation should happen via your install script
# configured in .cursor/environment.json, not in this Dockerfile.
# Do not COPY your source here; Cursor manages checkout of the correct commit.

# Default shell
CMD ["bash"]