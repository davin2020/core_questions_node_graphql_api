var express = require('express');
// Using these 2 packages instead of apollo-server-express
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

//VERY IMPORTANT, will not work if you use standard mysql package, MUST be promise based !
const mysql = require('promise-mysql');

//bodyParser not currently being used
const bodyParser = require('body-parser');

// 30march2021 this schmea no longer matches my db!
// 16jan22 see this for alt syntax option, esp wrt Resolvers and SQL Queries - https://www.techiediaries.com/node-graphql-tutorial/
var questionSchema = buildSchema(`
	"All available queries"
	type Query {
		"Fetch a list of all possible questions"
		allQuestions: [CoreQuestion]
		"Fetch a single CoreQuestion by ID and see Info"
		singleQuestion(q_id: Int!): CoreQuestion
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


// 16jan22 how to abstract the db connection so its not repeated twice?
var getSingleQuestion = async (args, req, res) => {

    const connection55 = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'password',
        database: 'corelifedb'
    }); 

    let tempResults = await connection55.query(
            queryGetQuestionByID, [args.q_id] );

    connection55.end();
    // console.log('outside of tempResults::: ')
    // console.log(tempResults); //'data' is undefined, so it [0]
    // let temp = tempResults[0];
    console.log(tempResults[0]);
    //no need to return nested array itself, as will result in null output ot GQL console, just need the first index
    return tempResults[0];
}


// [NEW FUNCTION 11JAN22 ]
var getAllQuestions = async (args, req, res) => {

    const connection77 = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: 'password',
        database: 'corelifedb'
    }); 

    let tempResults = await connection77.query(
            queryGetAllQuestions);

    connection77.end();
    // console.log('outside of tempResults connection77::: ')
    console.log(tempResults); //'data' is undefined, so it [0]
    // console.log(tempResults._results);

    // let temp = tempResults[0];
    // console.log(tempResults[0]);

    // [11jan22 new, reutrning tempResuts works instead of returning tempResults[1]] -  if u return index 1 instead of whole thing u get GQL error -  "message": "Expected Iterable, but did not find one for field \"Query.allQuestions\".",
    //no need to return nested array itself, just the first index
    // need to return whole array here, if only return first index gets error - "message": "Expected Iterable, but did not find one for field \"Query.allQuestions\"."
    return tempResults;
}


let queryGetAllQuestions = `
    SELECT q_id, question, gp_order, points_type 
    FROM ref_core_questions
    `

// The root provides a resolver function for each API endpoint
//these keywords on left of : are like the endpoint and MUST correspond with the keywords within the const/var schema on line 6 'var schema = buildSchema', while on the right are the variables which contain the results/callbacks of functions eg 'var getCourse' on line 91 etc
const questionRoot = {
    allQuestions: getAllQuestions,
    singleQuestion: getSingleQuestion
};


let queryGetQuestionByID = `
SELECT q_id, question, gp_order, points_type from ref_core_questions WHERE q_id = ? ; `

var app = express();
// app.use(bodyParser.json({type: 'application/json'}))
// app.use(bodyParser.urlencoded({extended: true}))

// Route for CoreQuestion stuff
// FYI rootValue is the graphqlResolvers above
//shoudlnt this be calling/opening the db connetion?
app.use('/graphql', graphqlHTTP({
    // 16jan22 can require schema and rootValue from antoher file
    schema: questionSchema,
    rootValue: questionRoot,
    // Enable the GraphiQL UI - why are these not showing up?
    graphiql: {
        defaultQuery: "# query {\n" +
            "#  singleQuestion (q_id: 1) {\n" +
            "#    q_id\n" +
            "#    question\n" +
            "#    points_type\n" +
            "#    gp_order\n" +
            "#  }\n" +
            "# }\n\n" +
            "query {\n" +
            "  allQuestions {\n" +
            "    q_id\n" +
            "    question\n" +
            "    points_type\n" +
            "    gp_order\n" +
            "  }\n" +
            "}" 
    },
}));

app.listen(4009);
console.log('Running a GraphQL API server at http://localhost:4009/graphql for Core Questions');
