'use strict';
const Nimiq = require('../../core/dist/node.js');
const _ = require('lodash');

const HEX_ALPHABET = '0123456789abcdef';

function toHex(buffer) {
    var hex = '';
    for (let i = 0; i < buffer.length; i++) {
        const code = buffer[i];
        hex += HEX_ALPHABET[code >>> 4];
        hex += HEX_ALPHABET[code & 0x0F];
    }
    return hex;
}

module.exports = function(app) {

    console.log('nimiq begin')

    const $ = {};

    function initApi () {
        $.blockchain.getBlocks(700, 500, true).then(function (blocks) {
            console.log('blocks ', blocks)
        });
    }

    (async () => {
        console.log('async begin')
        const networkConfig = new Nimiq.DumbNetworkConfig();

        $.consensus = await Nimiq.Consensus.full(networkConfig);


        $.blockchain = $.consensus.blockchain;
        $.accounts = $.blockchain.accounts;
        $.mempool = $.consensus.mempool;
        $.network = $.consensus.network;

        $.network.on('peer-joined', (peer) => {
            console.log(`Connected to ${peer.peerAddress.toString()}`);
        });

        $.consensus.on('established', () => initApi());
        $.consensus.on('lost', () => console.log('concensus lost'));

        $.blockchain.on('head-changed', (head) => {
            console.log('head-changed >>>')
            var _block = {
                height: $.blockchain.height,
                timestamp: $.blockchain.head.timestamp,
                hash: $.blockchain.headHash.toHex(),
                miner_address: $.blockchain.head.minerAddr.toUserFriendlyAddress(),
                transaction_count: $.blockchain.head.transactions.length,
                difficulty: $.blockchain.head.difficulty,
                size: $.blockchain.head.serializedSize,
                reward: Nimiq.Policy.blockRewardAt($.blockchain.height),
                // transactions: [],
                value: 0,
                fees: 0
            };

            var _transactions = [];

            if (_block.transaction_count > 0) {
                _.each($.blockchain.head.transactions, function(transaction) {
                    _transactions.push({
                        fee: transaction.fee,
                        hash: transaction._hash.toHex(),
                        receiver_address: transaction.recipient.toUserFriendlyAddress(),
                        sender_address: transaction.sender.toUserFriendlyAddress(),
                        timestamp: _block.timestamp,
                        value: transaction.value,
                        block_height: _block.height
                    })

                    _block.value += transaction.value;
                    _block.fees += transaction.fee;

                })
            }

            var Transaction = app.models.Transaction;
            var Account = app.models.Account;
            var Block = app.models.Block;

            Transaction.create(_transactions, function(err, transactions) {
                if (err) {
                    console.log('err ' , err);
                }
            })

            _.each(_transactions, function(transaction) {
                Account.findOne({where: {address: transaction.receiver_address}}, function(findErr, existingAccount) {
                    if (findErr) {
                        console.log('findErr ' , findErr);
                    }

                    var _accountObj = {}

                    if (existingAccount) {
                        console.log('existingAccount.balance ', existingAccount.balance )
                        _accountObj = existingAccount;
                        _accountObj.balance = existingAccount.balance + transaction.value;
                    } else {
                        _accountObj.address = transaction.receiver_address;
                        _accountObj.balance = transaction.value;
                    }

                    Account.upsert(_accountObj, function(upsertErr, newAccount) {
                        if (upsertErr) {
                            console.log('upsertErr ' , upsertErr);
                        }
                    })
                })
                Account.findOne({where: {address: transaction.sender_address}}, function(findErr, existingAccount) {
                    if (findErr) {
                        console.log('findErr ' , findErr);
                    }

                    var _accountObj = {}

                    if (existingAccount) {
                        console.log('existingAccount.balance ', existingAccount.balance )
                        _accountObj = existingAccount;
                        _accountObj.balance = existingAccount.balance - transaction.value;
                    }

                    Account.upsert(_accountObj, function(upsertErr, newAccount) {
                        if (upsertErr) {
                            console.log('upsertErr ' , upsertErr);
                        }
                    })
                })
            })


            Account.findOne({where: {address: _block.miner_address}}, function(findErr, existingAccount) {
                if (findErr) {
                    console.log('findErr ' , findErr);
                }

                var _accountObj = {}

                if (existingAccount) {
                    console.log('existingAccount.balance ', existingAccount.balance )
                    _accountObj = existingAccount;
                    _accountObj.balance = existingAccount.balance + _block.fees + _block.reward;
                } else {
                    _accountObj.address = _block.miner_address;
                    _accountObj.balance = _block.reward + _block.fees;
                }

                Account.upsert(_accountObj, function(upsertErr, newAccount) {
                    if (upsertErr) {
                        console.log('upsertErr ' , upsertErr);
                    }
                })
            })

            Block.upsertWithWhere({height: _block.height}, _block, function(err, instance) {

                if (err) {
                    console.log('err ' , err)
                }
            })

            if ($.consensus.established || head.height % 100 === 0) {
                console.log(`Now at block: ${head.height}`);
            }
        });

        $.network.connect();

    })().catch(e => {
        console.error(e);
        process.exit(1);
    });
};
