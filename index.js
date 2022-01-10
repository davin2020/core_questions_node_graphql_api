var express = require('express');
//im using these 2 instead of apollo-server-express
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

const mysql = require('promise-mysql');

//may not be needed?
const bodyParser = require('body-parser');

// [orig line 62]

// 30march2021 this schmea no longer matches my db!
var questionSchema = buildSchema(`
  "All available queries"
  type Query {
    "Fetch a list of all questions"
    questions: [CoreQuestion]
    "Fetch a single CoreQuestion by ID"
    question(q_id: Int!): CoreQuestion
    "Fetch a single CoreQuestion by ID and see Info"
    getQuestionInfo(q_id: Int!): CoreQuestion
  }
  "All available mutations"
  type Mutation {
    "Update the question based on ID"
    updateQuestion(q_id: Int!, question: String!): CoreQuestion
  }
  "A CoreQuestion object"
  type CoreQuestion {
    "CoreQuestion ID"
    q_id: Int
    "The actual question"
    question: String
    "Order of questions on GP Core form"
    gp_order: Int
    "The type of points, either ascending 123 or descending 321"
    points_type: Int
  }
  "An AnswerLabel object"
  type AnswerLabel {
    "The AnswerLabel scale ID"
    scale_id: Int
    "Label of the Answer"
    label: String
    "Points scored for choosing this answer"
    points: Int
  }
`);

//  [origin line 155]
// Dav Core CoreQuestion stuff
var getQuestion = (args) => {
    var q_id = args.q_id;
    return coreQuestionData.filter(question => question.q_id === q_id)[0];
}

// [origin line 169]
const queryDB = (req, sql, args) => new Promise((resolve, reject) => {
    console.log('inside const queryDB, value of req.mysqlDBBB:')
    //whats value of req.mysqldb, is it actualy connnected??
    console.log(req.mysqlDb);
    //console.log(JSON.stringify(req.mysqlDB, null, 2)); 

    console.log('value of req:')
    //console.log(JSON.stringify(req, null, 2));


    // tue eve - now data is being outputted to node console at least ! do i need to reutrn data instead of the error/obj??
    console.log('whats req.connection?')
    //console.log(JSON.stringify(req.connection, null, 2)); 
    // above line was causeing 'circular errror'


// ISSUE = here! 
// TypeError: Cannot read property 'query' of undefined
    //req.mysqlDb.queryDB() 
    //  req.mysqlDB is undefined, but why??
    //what is mysqlDb??  its supposed to be db connection but inside req obj so it can be passed around?
    //why is it null ?? how to make it not null and add it to request object??
    // req.mysqlDB

    // req.mysqlDb.query(sql, args, (err, rows) => {
    //     if (err) {
    //         return reject(err);
    //     }
    //     console.log('next line')
    //     rows.changedRows || rows.affectedRows || rows.insertId ? resolve(true) : resolve(rows);
    // });

    console.log('seomthing else')
}); //eo promise above

var getQuestions = (args) => {
    // if (args.topic) {
    //     var topic = args.topic;
    //     return coursesData.filter(course => course.topic === topic);
    // } else {
    //     return coreQuestionData;
    // }
    return coreQuestionData;
}

// [origin line 284]
// ===== LATEST sn 4 april
var getQuestionInfo55 = async (args, req, res) => {

    const connection55 = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'password',
        database: 'corelifedb'
    }); 

    //this is still wehre the issue is
    // let tempResults = await connection55.query(
    //         queryGetQuestionsByID, [args.q_id], (err, results, fields) => {
 
    // return await connection55.query(
    //         queryGetQuestionsByID, [args.q_id], function (err, results, fields) {
    //                 console.log('DORY line 297...');
    //                 console.log(results)
    //             });

    let tempResults = await connection55.query(
            queryGetQuestionsByID, [args.q_id] );

    connection55.end();
    console.log('outside of tempResults::: ')
    // console.log(tempResults['_results']);
    console.log(tempResults); //'data' is undefined, so it [0]
    // console.log(tempResults._results);
    // console.log('   VALUES   ')
    //  console.log(tempResults.sql);
    // console.log(tempResults.values);

    let temp = tempResults[0];
    console.log(tempResults[0]);

    // callback(null, results);    
    return tempResults[0];
    // return temp;
}

// [orig line 476]
//m29march Dav -  this is now working ok!
// orange keywords id and topic probably have to match the schema above!
var updateQuestionVar = ({q_id, question}) => {
    coreQuestionData.map(questionItem => {
        if (questionItem.q_id === q_id) {
            console.log('found questionItem by q_id'); //tiis is output to Node console not browser!
            questionItem.question = question;
            return questionItem;
        }
    });
    //end of callback mapping fn for each item in array
    //this finds the newly updated course based on id and returns it, can return undefined if id & thus course doesnt exist - orange keyword course is not related to orange keyword questionItem but is essentially doing the same thing
    var result = coreQuestionData.filter(questionItem2 => questionItem2.q_id === q_id)[0]
    console.log('heres result questionItem2');
    console.log(result); //returns undefined if id doenst exist
    return result;
}

// The root provides a resolver function for each API endpoint
//these keywords on left of : are like the endpoint and MUST correspond with the keywords within the const/var schema on line 6 'var schema = buildSchema', while on the right are the variables which contain the results/callbacks of functions eg 'var getCourse' on line 91 etc
// Dav root for Questions
const questionRoot = {
    question: getQuestion,
    questions: getQuestions,
    // updateQuestion: updateQuestionLabel
    updateQuestion: updateQuestionVar,
    getQuestionInfo: getQuestionInfo55
    // getQuestionInfo: (args, req) => queryDB(req, queryGetQuestionsByID, [args.q_id]).then(data => data[0])
};

//how to output results of getLearners ? will get logged to Node console!
// console.log('output of getLearners: ')
// console.log(getLearners)

// from connect.js
let queryGetBasicQuestions = `
    SELECT q_id, question, gp_order, points_type 
    FROM ref_core_questions
    `

// var rootDB = {
//   hello: () => "World"
// };

let queryGetQuestionsByID = `
SELECT q_id, question, gp_order, points_type from ref_core_questions WHERE q_id = ? ; `

// new db stuff - using promises and then, instead of async/await
// green keywords neesd to be in schema i want to query!
//none of these queries are actually workign! t30march - plus this isnt usings async/await
var rootDB = {
  questions: (args, req) => queryDB(req, queryGetBasicQuestions).then(data => data),
  getQuestionInfo: (args, req) => queryDB(req, queryGetQuestionsByID, [args.q_id]).then(data => data[0])
};
console.log('after var rootDB: ');
console.log(JSON.stringify(rootDB, null, 2)); //obj is empty atm
 


var app = express();
app.use(bodyParser.json({type: 'application/json'}))
app.use(bodyParser.urlencoded({extended: true}))

// Route for CoreQuestion stuff
// FYI rootValue is the graphqlResolvers above
// rootValue: was questionRoot, now rootDB but doenst work - somthing is wrong withn rootDB stuff

// ISSUES here as db isnt being connected to!
//shoudlnt this be calling/opening the db connetion?
app.use('/graphql', graphqlHTTP({
    schema: questionSchema,
    rootValue: questionRoot,
    // Enable the GraphiQL UI
    graphiql: {
        defaultQuery: "query {\n" +
            "  questions {\n" +
            "    q_id\n" +
            "    question\n" +
            "    points_type\n" +
            "  }\n" +
            "}"
    },
}));


// [orig line 565]
// Database stuff t30march2021 - can call this by going to http://localhost:4004/
// does db conn stuff need to be async??
// Do i have to/am i suppposed to pass in req, resp when im calling thsi from the UI??
// @7jan22 thsi db connection works w 4th query in gql console to return question w matchingn id
app.use((req, res, next) => {
    req.mysqlDb = mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'password',
        database: 'corelifedb'
    });
    //error @7jan22 re this is nto a function 
    // req.mysqlDb.connect((err) => {
    req.mysqlDb.query(queryGetBasicQuestions, args, (err, rows)=> {
        if (err) {
            console.log('Error connecting to DB: ' + err);
            // console.log(err);
            return; 
        }
        console.log('Connected to MySQL DB!');
        });
    console.log('Line after DB is connected...'); // does this line get logged before DB connection is made, cos im not doing async await?


    //maybe call sql queries from here??
    let queryGetBasicQuestions = `
    SELECT q_id, question, gp_order, points_type 
    FROM ref_core_questions
    `
    // [orig commens line 591 removed]

    next();
});

//  [orig line 625]
app.listen(4009);
console.log('Running a GraphQL API server at http://localhost:4009/graphql for Core Questions');

// NOTES
// instead of having multiplel end points, u only have 1 Endpoint and u can ask for whatever u want from it ie theres one single 'smart' endpoint, generally used to serve data in json format

//how to log an object
// console.log(JSON.stringify(rootDB, null, 2)); 

// [2022 query to run in GQL console]
// query {
//   getQuestionInfo (q_id: 7) {
//     q_id
//     question
//     gp_order
//   }
// }
