#!/bin/bash
set -e

# Use the correct Node version from .nvmrc
. $HOME/.nvm/nvm.sh
nvm use

# Install dependencies using pnpm
pnpm install 