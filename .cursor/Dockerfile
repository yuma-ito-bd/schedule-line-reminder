# Base image with Bun preinstalled (Debian-based)
FROM oven/bun:1.2-debian

# Avoid interactive prompts during apt operations
ENV DEBIAN_FRONTEND=noninteractive

# Install system packages
# - git: version control
# - curl, unzip, ca-certificates: required for SAM CLI installer and common tooling
# - vim, nano: text editors for development
# - tree: directory listing utility
# - htop: system monitoring
# - jq: JSON processor
# Clean apt cache to reduce image size
RUN set -eux; \
	apt-get update; \
	apt-get install -y --no-install-recommends \
		git \
		curl \
		unzip \
		ca-certificates \
		vim \
		nano \
		tree \
		htop \
		jq \
		bash-completion; \
	rm -rf /var/lib/apt/lists/*

# Install AWS SAM CLI via the official installer (per AWS docs)
# Detect architecture and download the corresponding release zip
RUN set -eux; \
	arch="$(dpkg --print-architecture)"; \
	case "$arch" in \
		amd64) sam_arch="x86_64" ;; \
		arm64) sam_arch="arm64" ;; \
		*) echo "Unsupported architecture: $arch" >&2; exit 1 ;; \
	esac; \
	curl -L "https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-${sam_arch}.zip" -o /tmp/aws-sam-cli.zip; \
	unzip /tmp/aws-sam-cli.zip -d /tmp/sam-installation; \
	/tmp/sam-installation/install; \
	rm -rf /tmp/aws-sam-cli.zip /tmp/sam-installation; \
	# Show versions to verify install succeeded during image build
	bun --version; \
	git --version; \
	sam --version

# Create a non-root user for development
RUN useradd -m -s /bin/bash ubuntu && \
	echo "ubuntu ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set user and working directory to home directory (best practice for Cursor)
USER ubuntu
WORKDIR /home/ubuntu

# The agent's runtime dependency installation should happen via your install script
# configured in .cursor/environment.json, not in this Dockerfile.
# Do not COPY your source here; Cursor manages checkout of the correct commit.

# Default shell
CMD ["bash"]
