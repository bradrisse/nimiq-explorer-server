# Nimiq Explorer Server

## What is This?
This is the backend server for [NimiqExplorer.com](https://nimiqexplorer.com). The explorer allows you to view all the details of the blockchain is a simple and visual way. This can be used to verify block rewards, transactions, or just to see blockchain statistics. The frontend sourcecode is located at [https://github.com/bradrisse/nimiq-explorer](https://github.com/bradrisse/nimiq-explorer) and the Nimiq core is located at [https://github.com/nimiq-network/core](https://github.com/nimiq-network/core).

## How does it work?
A Nimiq node is set up upon starting the server and as the blockchain is downloaded each block, transaction, account is serperated/linked and put into a database that can be queried.

## How was it built?
The backend server is built using [Loopback API Framework](https://loopback.io/) and [MongoDB](https://www.mongodb.com/) for the database. The frontend and Nimiq core are added as submodules and are compiled upon cloning.

## How do I contribute?
Use the quickstart guide to run the server locally, add you changes to the backend server and/or frontend, then create a pull request.

## QuickStart Guide

1. Download Clone `git clone --recursive https://github.com/bradrisse/nimiq-explorer-server`
    - recursive is used to download the submodules along with the server source code
    
2. Install Packages `yarn` or `npm install`
    - postinstall will get triggered and install/build submodule packages
    
3. Setup MongoDB: Add a mongo db with the name `nimiq-explorer` with a user `root` and a password `root`
    - root/root is fine for local dev, it will be changed for production
    
4. Launch API Server `node .`
    - The frontend should automatically open at [http://localhost:3000](http://localhost:3000)
    
## Shoutouts

I would like to give a shoutout to [@sisou](https://github.com/sisou) for creating [Nimiq Watch](https://nimiq.watch) and was the inspiration for creating this.

I would also like to give a shoutout to the Nimiq Team for creating an amazing browser-based blockchain [Nimiq](https://nimiq.com)
    
