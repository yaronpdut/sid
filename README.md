# Documantation

The OpenShift `nodejs` cartridge documentation can be found at:

http://openshift.github.io/documentation/oo_cartridge_guide.html#nodejs

# Open Issues and Action Items

1. add vote round for "voters" api - done
2. add BU filter to "votes" - done
3. add api for final votes.
4. provide BU list.

# API

## votes

Method: `GET`
Sample: `http://127.0.0.1:8080/votes`
Mapped to: `REST_Votes`

return list of vote summary in format of:

[
  {
    "projectCode": "ppppp",
    "value": nnnn,
    "weightValue" nnnn: 
  }
]

## voters

Method: `GET`
Sample: `http://127.0.0.1:8080/voters?id=Yaron Pdut`
Mapped to: `REST_Votes`

Return user details and list of project he can vote to.
 
{
  "result": "Found",
  "user": {
    ...
    ...
    ...
    ...
    "rating": [
    ...
    ...
    ]
  },
  "projects": [
    {
      "_id": "usEhagjAx7T1fcuP",
      "project_code": "2",
    .....
    .....
    .....
    }
  ],
  "NOM": 3
} 

NOM = maximum number of project user can vote to. 

## vote

Method: POST

Perform the actual vote.

parameters:
1. id
2. token
3. project1..projectN

POST http://127.0.0.1:8080/vote?id=nnn&token=tttt&project1=ppp&project2=ppp

results:

{ result: "Error: Invalid query string parameters."}
{ result: "Error: invalid user name or token" }
{ result: "OK" }


## projects

get project detail with members list.
 
parameters:
1. id - project id

{
   "project":    {
      "project_code": "1",
      "project_name": "A Project",
      "description": "This is a project",
      "bu": "mcr",
      "_id": "B4El4wUhvJm6REUz"
   },
   "members":    [
            {
         "userName": "tal.green",
         "emp_number": "12223",
         "site": "raana",
         "bu": "mc",
         "project": "1",
         "voted": "",
         "final_vote": "",
         "_id": "RefLLRBvas4"
      },
            {
         "userName": "yron.pdt",
         "emp_number": "723",
         "site": "raanana",
         "bu": "mc",
         "project": "1",
         "voted": "3",
         "final_vote": "",
         "_id": "VxIyCJ1HnIF"
      }
   ]
}

# vote return codes

error: 0, reason: "OK"
error: 1, reason: "Error: User can not vote to a project associated with"
error: 2, reason: "Error: Invalid Project Id. Project code not found"
error: 3, reason: "Error: User already voted"
error: 4, reason: "Error: User cannot vote to a project not in its own BU"
error: 5, reason: "Error: Invalid Project Id. Project code not found"
error: 6, result: "Error: Invalid user name or token"


# Installation

When you set up a new environment, use `npm install`.

rhc tail -a <app>