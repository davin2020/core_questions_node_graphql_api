var express = require('express');
// Using these 2 packages instead of apollo-server-express
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

//VERY IMPORTANT, will not work if you use standard mysql package, MUST be promise based !
const mysql = require('promise-mysql');

//bodyParser not currently being used, but will be
// const bodyParser = require('body-parser');

// 16jan22 Try this for alt syntax option, esp wrt Resolvers and SQL Queries - https://www.techiediaries.com/node-graphql-tutorial/

// FYI CoreQuestions object maps to table ref_core_questions and AnswerLabel object maps to reef_core_scale. Table ref_core_points has not yet been mapped to an object here
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
	}
`);

// 16jan22 ISSUE how to abstract/separate out the db connection so its not repeated twice?
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
    console.log(tempResults[0]);
    // Do not return whole array itself, as will result in null output in GQL console, but ok in node console, only return first index
    return tempResults[0];
}

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
    console.log(tempResults); 

    // Musts return whole array here, if only return first index it gives GQL error - "message": "Expected Iterable, but did not find one for field \"Query.allQuestions\"."
    return tempResults;
}

let queryGetAllQuestions = `
    SELECT q_id, question, gp_order, points_type 
    FROM ref_core_questions
    `

let queryGetQuestionByID = `
SELECT q_id, question, gp_order, points_type from ref_core_questions WHERE q_id = ? ; `

// The root provides a resolver function for each API endpoint - the keywords on left of : are like the endpoint and MUST correspond with the keywords within the 'var questionSchema = buildSchema' above, while on the right are the variables which contain the results/callbacks of functions that query the db
const questionRoot = {
    allQuestions: getAllQuestions,
    singleQuestion: getSingleQuestion
};

var app = express();
// app.use(bodyParser.json({type: 'application/json'}))
// app.use(bodyParser.urlencoded({extended: true}))

// Route with default queries already written in GQL console
// FYI rootValue is the graphqlResolvers above
app.use('/graphql', graphqlHTTP({
    // 16jan22 can require schema and rootValue from antoher file
    schema: questionSchema,
    rootValue: questionRoot,
    // Enable the GraphiQL UI - why are these not showing up?
    graphiql: {
        defaultQuery: "# query {\n" +
            "#  singleQuestion (q_id: 3) {\n" +
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
// ISSUE shouldn't this above also be calling/opening the db connetion?

app.listen(4009);
console.log('Running a GraphQL API server at http://localhost:4009/graphql for Core Questions');