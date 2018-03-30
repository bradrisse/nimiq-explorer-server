'use strict';
const Nimiq = require('../../core/dist/node.js');
const _ = require('lodash');
const async = require('async');

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

var blockDeconstructed = 1;
var isRunning = false;

module.exports = function(app) {

    console.log('nimiq begin')

    const $ = {};

    // TODO set default to 'main' for MainNet.
    const network = 'dev';

    var blocksQueue = [];

    function initApi () {
        // $.blockchain.getBlocks(700, 500, true).then(function (blocks) {
        //     console.log('blocks ', blocks)
        // });

        runQueue()
    }

    function runQueue() {
        if (!isRunning && blockDeconstructed <= $.blockchain.height) {
            isRunning = true;
            blockDeconstructed++;
            console.log('running queue ', blockDeconstructed)
            $.blockchain.getBlockAt(blockDeconstructed, true).then(function (block) {
                async.waterfall([
                    function(callback) {
                        _createblock(block, callback)
                    },
                    function(_block, transactions, callback) {
                        _updateTransactions(_block, transactions, callback)
                    },
                    function(_block, callback) {
                        runBlock(_block, callback)
                    }
                ], function (error, newBlock) {
                    if (error) { alert('Something is wrong!'); }
                    console.log('newBlock ', newBlock)
                    isRunning = false;
                    if ((blockDeconstructed + 1) <= $.blockchain.height) {
                        runQueue()
                    }
                });
            });
        }
    }

    function _updateTransaction(transaction, cb) {
        async.series([
            function(callback) {
                _recieverAccount(transaction, callback)
            },
            function(callback) {
                _senderAccount(transaction, callback)
            }
        ], function (err, results) {
            cb(null, results);
        });
    }

    function _updateTransactions(_block, _transactions, outerCallback) {
        console.log('_updateTransactions ', _block, _transactions)
        var Account = app.models.Account;

        if (_transactions.length > 0) {
            async.eachSeries(_transactions, function (transaction, callback) {
                _updateTransaction(transaction, callback)
            }, function done() {
                console.log('each')
                outerCallback(null, _block);
            });
        } else {
            outerCallback(null, _block);
        }
    }

     function _recieverAccount(transaction, callback) {
        var Account = app.models.Account;
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

                    callback(null, '')
                })
            })
    }

    function _senderAccount(transaction, callback) {
        var Account = app.models.Account;
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

            console.log('_senderAccount _accountObj ', _accountObj)

            Account.upsert(_accountObj, function(upsertErr, newAccount) {
                if (upsertErr) {
                    console.log('upsertErr ' , upsertErr);
                }
                callback(null, '')
            })
        })
    }

    function _createblock(block, callback) {
        console.log('_createblock >>> ')
        var _block = {
            height: block.height,
            timestamp: block.timestamp,
            hash: block.bodyHash.toHex(),
            miner_address: block.minerAddr.toUserFriendlyAddress(),
            transaction_count: block.transactions.length,
            difficulty: block.difficulty,
            size: block.serializedSize,
            reward: Nimiq.Policy.blockRewardAt(block.height),
            // transactions: [],
            value: 0,
            fees: 0
        };

        var _transactions = [];

        if (_block.transaction_count > 0) {
            _.each(block.transactions, function(transaction) {
                _transactions.push({
                    fee: transaction.fee,
                    hash: transaction.hash().toHex(),
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

        Transaction.create(_transactions, function(err, transactions) {
            if (err) {
                console.log('err ' , err);
            }

            callback(null, _block, transactions);
        })
    }

    function runBlock(_block, callback) {


            var Account = app.models.Account;
            var Block = app.models.Block;


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

                callback(null, instance);
            })
    }

    (async () => {
        console.log('async begin')
        Nimiq.GenesisConfig.init(Nimiq.GenesisConfig.CONFIGS[network]);
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
            console.log('head-changed ', head.height)
            runQueue()
        });

        $.network.connect();

    })().catch(e => {
        console.error(e);
        process.exit(1);
    });
};
