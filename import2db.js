
var  fs = require('fs')
    ,obj;

var Datastore = require('nedb') // https://github.com/louischatriot/nedb
    ;


// Read the file and send to the callback

fs.readFile('../hc.json', handleFile)


function handleFile(err, data)
{
    if (err) throw err
    obj = JSON.parse(data);

    var email, name, lname;
    var record;

    var db = new Datastore({filename: "voters1", autoload: true});

    for (index = 0; index < obj.length; ++index) {
        email = obj[index].email.substring(
                        0,
                        obj[index].email.indexOf("@")
        );

        name = email.split(".");

        record = {
             userName   :   name[0] + " " + name[1]
            ,emp_number :   obj[index].EmployeeNumber
            ,site       :   obj[index].Country
            ,bu         :   obj[index].VP_name
            ,project    :   ""
            ,voted      :   ""
            ,final_vote :   ""
	    ,location   :   obj[index].Location	
	    ,email      :   obj[index].email
	    ,country    :   obj[index].Country		
	    
            };

        db.insert(record, function (err, newDoc) {   // Callback is optional
            // newDoc is the newly inserted document, including its _id
            // newDoc has no key called notToBeSaved since its value was undefined
        });
        console.log("%j", record);


    }
}
