'use strict';
var app = require('../../server/server');
const _ = require('lodash')


module.exports = function(Block) {


    Block.latest = function(cb) {
        Block.find({limit: 20, order: 'timestamp DESC'}, function(err, blocks) {
            cb(null, blocks);
        });
    };

    Block.remoteMethod('latest', {
        returns: { type: 'array', root: true},
        http: {path: '/latest', verb: 'get'}
    });

    Block.height = function(_height, cb) {
        console.log('_height ', _height)
        Block.findOne({where: {height: _height}}  , function(err, block) {
            cb(null, block);
        });
    };

    Block.remoteMethod('height', {
        returns: { type: 'object', root: true},
        accepts: {arg: 'height', type: 'string', required: true},
        http: {path: '/height/:height', verb: 'get'}
    });

    Block.hash = function(_hash, cb) {
        console.log('_hash ', _hash)
        Block.findOne({where: {hash: _hash.toLowerCase()}}  , function(err, block) {
            cb(null, block);
        });
    };

    Block.remoteMethod('hash', {
        returns: { type: 'object', root: true},
        accepts: {arg: 'hash', type: 'string', required: true},
        http: {path: '/hash/:hash', verb: 'get'}
    });

    Block.difficulty = function(_range, cb) {
        console.log('_range ', _range)
        //get time now
        var _timeNow = Math.floor(Date.now() / 1000);
        //get time now - 24 hours
        var _timeAgo, _timeSplit;

        switch (_range) {
            case 'day':
                _timeAgo = _timeNow - (60 * 60 * 24);
                _timeSplit = 60 * 15 // 15min
                break;
            case 'week':
                _timeAgo = _timeNow - (60 * 60 * 24 * 7);
                _timeSplit = 60 * 60// 1hr
                break;
            case 'month':
                _timeAgo = _timeNow - (60 * 60 * 24 * 30);
                _timeSplit = 60 * 60 * 4 // 4hr
                break;
            case 'year':
                _timeAgo = _timeNow - (60 * 60 * 24 * 365);
                _timeSplit = 60 * 60 * 48 // 2 days
                break;
            default:
                _timeAgo = _timeNow - (60 * 60 * 24 * 30);
                _timeSplit = 900
                break;
        }

        //find where timestamp between now and last 24hours
        Block.find({where: {timestamp: {between: [_timeAgo,_timeNow]}}, fields: ['height', 'difficulty', 'timestamp']}  , function(err, blocks) {
            var intervalObjs = {}
            var intervals = []

            _.each(blocks, function(block) {
                var _interval = block.timestamp - (block.timestamp % _timeSplit)
                if (!intervalObjs[_interval]) {
                    intervalObjs[_interval] = {
                        timestamp: _interval,
                        height: block.height,
                        difficulty: block.difficulty
                    }
                } else {
                    intervalObjs[_interval].height = intervalObjs[_interval].height < block.height ? block.height : intervalObjs[_interval].height;
                    intervalObjs[_interval].difficulty += block.difficulty
                }
            })

            _.each(Object.keys(intervalObjs), function(_key) {
                console.log('_key ', _key)
                intervals.push(intervalObjs[_key])
            })
            cb(null, intervals);
        });
    };

    Block.remoteMethod('difficulty', {
        returns: { type: 'object', root: true},
        accepts: {arg: 'range', type: 'string', required: true},
        http: {path: '/statistics/difficulty/:range', verb: 'get'}
    });

    Block.miners = function(_range, cb) {
        console.log('_range ', _range)
        //get time now
        var _timeNow = Math.floor(Date.now() / 1000);
        //get time now - 24 hours
        var _timeAgo;

        switch (_range) {
            case 1:
                _timeAgo = _timeNow - (60 * 60 * 1);
                break;
            case 2:
                _timeAgo = _timeNow - (60 * 60 * 2);
                break;
            case 12:
                _timeAgo = _timeNow - (60 * 60 * 12);
                break;
            case 24:
                _timeAgo = _timeNow - (60 * 60 * 25);
                break;
            default:
                _timeAgo = _timeNow - (60 * 60 * 1);
                break;
        }

        //find where timestamp between now and last 24hours
        Block.find({where: {timestamp: {between: [_timeAgo,_timeNow]}}, fields: ['miner_address', 'timestamp']}  , function(err, blocks) {
            var intervalObjs = {}
            var intervals = []

            _.each(blocks, function(block) {
                if (!intervalObjs[block.miner_address]) {
                    intervalObjs[block.miner_address] = {
                        miner_address: block.miner_address,
                        blocks_mined: 1
                    }
                } else {
                    intervalObjs[block.miner_address].blocks_mined += 1
                }
            })

            _.each(Object.keys(intervalObjs), function(_key) {
                intervals.push(intervalObjs[_key])
            })
            cb(null, intervals);
        });
    };

    Block.remoteMethod('miners', {
        returns: { type: 'object', root: true},
        accepts: {arg: 'range', type: 'string', required: true},
        http: {path: '/statistics/miners/:range', verb: 'get'}
    });

};
