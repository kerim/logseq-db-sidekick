# Logseq DB Sidekick 🚀

> **Forked from [Logseq Copilot](https://github.com/EINDEX/logseq-copilot) by [@EINDEX](https://github.com/EINDEX)**
> A specialized version focused on **DB graphs only** with **HTTP server integration** for **search-only** functionality.

<p align="center">
  <a href="LICENSE" target="_blank">
    <img alt="GPL-3.0 License" src="https://img.shields.io/github/license/kerim/logseq-db-sidekick.svg?style=flat-square" />
  </a>
  <img alt="TypeScript" src="https://img.shields.io/badge/-TypeScript-blue?style=flat-square&logo=typescript&logoColor=white" />
</p>

Logseq DB Sidekick is a browser extension that allows you to access your Logseq **DB graphs** while browsing. It shows relevant notes from your Logseq database alongside search results on popular search engines. This fork is specifically designed to work with Logseq's new database graph format via an HTTP server. 🧠

## What Makes This Fork Different?

This fork differs from the original Logseq Copilot in several key ways:

- **DB Graphs Only**: Works exclusively with Logseq's new database (DB) graph format, not file-based/markdown graphs
- **HTTP Server Architecture**: Uses a separate Python HTTP server instead of Logseq's plugin API
- **Search-Only Focus**: Designed purely for displaying search results - no editing, no quick capture features
- **Independent Operation**: Doesn't require Logseq Desktop to be running

## Requirements

- **Logseq HTTP Server** - A companion server that wraps @logseq/cli commands
  - See setup instructions: [logseq-http-server](https://github.com/kerim/logseq-http-server)
- **DB Graph** - Only works with Logseq database graphs (not file-based graphs)

## Features

- 🔍 Show Logseq DB graph content when you search on popular search engines
- 🌐 Supports Google, Bing, Ecosia, Baidu, Yandex, DuckDuckGo, SearX
- 📊 Full-text search across all block content
- 🔗 Direct links to open blocks in Logseq Desktop

## Installation

### HTTP Server Setup (Required First)

1. Install the HTTP server from: https://github.com/kerim/logseq-http-server
2. Start the server: `python3 logseq_server.py`
3. The server will run on `http://localhost:8765` by default

### Browser Extension

*(Installation instructions to be added - currently in development)*

## Configuration

After installing:

1. Click the extension icon and go to Settings
2. Configure HTTP Server connection:
   - **Host**: `localhost` (default)
   - **Port**: `8765` (default)
3. Click "Refresh Graphs" to load your available DB graphs
4. Select your graph from the dropdown
5. Click "Connect" to verify connection

## Credits & Acknowledgments

This project would not exist without:

- **[Logseq Copilot](https://github.com/EINDEX/logseq-copilot)** by [@EINDEX](https://github.com/EINDEX) - The original extension that this fork is based on
- **[Logseq](https://logseq.com)** - The amazing knowledge management platform
- **[chatGPT4Google](https://github.com/wong2/chatgpt-google-extension)** - Inspiration for the original Logseq Copilot architecture

## Support the Original Creator

If you find this tool useful, please consider supporting the original creator of Logseq Copilot:

<p align="left">
   <a href="https://img.shields.io/github/sponsors/eindex" target="_blank">
      <img alt="GitHub Sponsors" src="https://img.shields.io/github/sponsors/eindex?style=flat-square&logo=github">
   </a>
  <a href="https://www.buymeacoffee.com/eindex" target="_blank">
    <img alt="Buy me a Coffee" src="https://img.shields.io/badge/Buy%20me%20a%20coffee-gray?style=flat-square&logo=buymeacoffee">
  </a>
</p>

## Contributing

Contributions are welcome! If you want to contribute:

- Fork this repository and clone it to your local machine
- Create a new branch for your feature or bug fix
- Make your changes and commit them with a clear message
- Submit a pull request

## License

GPLv3 - Same as the original Logseq Copilot project

## Differences From Original

For a detailed comparison with the original Logseq Copilot, see [DIFFERENCES.md](DIFFERENCES.md)
