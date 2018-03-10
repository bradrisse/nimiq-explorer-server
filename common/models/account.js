'use strict';
var app = require('../../server/server');

module.exports = function(Account) {

    Account.afterRemote('findById', function(ctx, account, next) {
        var Transaction = app.models.Transaction;
        if(ctx.result && ctx.args.filter && ctx.args.filter.include.indexOf('transactions') > -1) {
            Transaction.find({where: {or:[{sender_address: account.address}, {receiver_address: account.address}]}, order: 'timestamp ASC'}, function(err, transactions) {
                var _account = JSON.parse(JSON.stringify(account))
                _account.transactions = transactions
                ctx.result = _account;
                next();
            });
        } else {
            next();
        }
    });
};
