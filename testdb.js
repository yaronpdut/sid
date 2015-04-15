var MongoClient = require('mongodb').MongoClient;

var MongoServerUrl = 'mongodb://:localhost/test';

MongoClient.connect(MongoServerUrl, function (err, db)
{
    var collection = db.collection('voters');

    collection.aggregate(
        [
            { $sort : { voted: 1} },
            { $group: {
                _id : "$voted",
                count: { $sum: 1 } } }
        ],
        function (err, result) {
            console.log(JSON.stringify(result));
        });

});
