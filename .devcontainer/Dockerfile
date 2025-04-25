FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install Node.js 18
ARG NODE_VERSION=18
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | PROFILE=/dev/null bash \
    && . $HOME/.nvm/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Install pnpm
RUN npm install -g pnpm

# Clean up
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/* 