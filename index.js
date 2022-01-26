var express = require('express');
// Using these 2 packages instead of apollo-server-express
var { graphqlHTTP } = require('express-graphql');
var { buildSchema } = require('graphql');

//VERY IMPORTANT, will not work if you use standard mysql package, MUST be promise based !
const mysql = require('promise-mysql');

//bodyParser not currently being used, but will be
// const bodyParser = require('body-parser');

// 16jan22 Try this for alt syntax option, esp wrt Resolvers and SQL Queries - https://www.techiediaries.com/node-graphql-tutorial/

// FYI CoreQuestions object maps to table ref_core_questions and ScaleLabel object maps to reef_core_scale. Table ref_core_points has not yet been mapped to an object here
    // allScaleLabels: [ScaleLabel] ==> this means return an array
    // allScaleLabels: ScaleLabel ==> this means return a single item to the GQL console, which is separate to the Node console!
var questionSchema = buildSchema(`
	"All available queries"
	type Query {
		"Fetch a list of all possible questions from table ref_core_questions"
		allQuestions: [CoreQuestion]
		"Fetch a single CoreQuestion by ID and see Info"
		singleQuestion(q_id: Int!): CoreQuestion
        "Fetch a list of all scale labels from table ref_core_scale"
        allScaleLabels: [ScaleLabel]
        allQuestionsAndPoints: [CoreQuestionPoints]
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
	"An ScaleLabel object"
	type ScaleLabel {
		"The ScaleLabel ID"
		scale_id: Int
		"Label of the Scale eg Often or Sometimes etc"
		label: String
	}
    "A CoreQuestionPoints object"
    type CoreQuestionPoints {
        "CoreQuestion ID"
        q_id: Int
        "Order of questions on GP Core form"
        gp_order: Int
        "The actual question"
        question: String
        "The type of points, either ascending 123 or descending 321"
        points_type: Int
        "Points for each Answer Label, array of ints"
        pointsA_not: Int
        pointsB_only: Int
        pointsC_sometimes: Int
        pointsD_often: Int
        pointsE_most: Int
    }
`);
// 18jan22 re above fields, currently they have to match the column names as returned by the DB query - but how to translate db query record set into an object and pass back an array of objects, which may contains nested arrays? eg label_points: [Int]

//separated out db details for now
const databaseDetails = {
        host: '127.0.0.1',
        user: 'user',
        password: 'password',
        database: 'core_questions_db'
}

var getSingleQuestion = async (args, req, res) => {

    const connection55 = await mysql.createConnection(databaseDetails); 

    let tempResults = await connection55.query(
            queryGetQuestionByID, [args.q_id] );

    connection55.end();
    console.log(tempResults[0]);
    // Do not return whole array itself, as will result in null output in GQL console, but ok in node console, only return first index
    return tempResults[0];
}

var getAllQuestions = async (args, req, res) => {

    const connection77 = await mysql.createConnection(databaseDetails); 

    let tempResults = await connection77.query(
            queryGetAllQuestions);

    connection77.end();
    console.log(tempResults); 

    // Must return whole array here, if only return first index it gives GQL error - "message": "Expected Iterable, but did not find one for field \"Query.allQuestions\"."
    return tempResults;
}

let queryGetAllQuestions = `
    SELECT q_id, question, gp_order, points_type 
    FROM ref_core_questions ;
    `

let queryGetQuestionByID = `
    SELECT q_id, question, gp_order, points_type 
    FROM ref_core_questions 
    WHERE q_id = ? ;
    `

let queryGetAllLabels = `
    SELECT scale_id, label  
    FROM ref_core_scale
    ORDER BY scale_id ;
    `

var getAllLabels = async (args, req, res) => {

    const connection77 = await mysql.createConnection(databaseDetails); 

    let tempResults = await connection77.query(
            queryGetAllLabels);

    // connection77.end();
    console.log(tempResults); 

    // Must return whole array here, if only return first index it gives GQL error - "message": "Expected Iterable, but did not find one for field \"Query.allScaleLabels\"."
    // tempResults[0] returns first item ok, but tempResults doesnt return whole array - as I forgot to speciify that ARRAY in returned in buildSchema above!
    return tempResults;
}

//ISSUE but ths wont return an array of ints for the label_points ! how to do that? - how to turn db record set into object w nested arrys for labels and points? what woudl structure of obj be like?
let queryGetAllQuestionsAndPoints = `
    SELECT rcq.q_id, rcq.gp_order, rcq.question, rcq.points_type, rcp.pointsA_not, rcp.pointsB_only, rcp.pointsC_sometimes, rcp.pointsD_often, rcp.pointsE_most 
    FROM ref_core_questions AS rcq 
    INNER JOIN ref_core_points AS rcp 
    ON rcq.points_type = rcp.points_id 
    ORDER BY rcq.gp_order ;
    `
    //CRAIG subqueries in sql or multiple queries ??

var getAllQuestionsAndPoints = async (args, req, res) => {
    const connection77 = await mysql.createConnection(databaseDetails); 

    let tempResults = await connection77.query(
            queryGetAllQuestionsAndPoints);

    // connection77.end();
    console.log(tempResults); 

    // Must return whole array here, if only return first index it gives GQL error - "message": "Expected Iterable, but did not find one for field \"Query.allQuestionsAndPoints\"."
    // tempResults[0] returns first item ok, but tempResults doesnt return whole array - as need to speciify that ARRAY in returned in buildSchema above!
    return tempResults;
}


// The root provides a resolver function for each API endpoint - the keywords on left of : are like the endpoint and MUST correspond with the keywords within the 'var questionSchema = buildSchema' above, while on the right are the variables which contain the results/callbacks of functions that query the db
const questionRoot = {
    allQuestions: getAllQuestions,
    singleQuestion: getSingleQuestion,
    allScaleLabels: getAllLabels,
    allQuestionsAndPoints: getAllQuestionsAndPoints
};

var app = express();
// app.use(bodyParser.json({type: 'application/json'}))
// app.use(bodyParser.urlencoded({extended: true}))

// Route with default queries already written in GQL console
// FYI rootValue is the graphqlResolvers above - can require schema and rootValue from another file
app.use('/graphql', graphqlHTTP({
    schema: questionSchema,
    rootValue: questionRoot,
    // Enable the GraphiQL UI -
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
            "}\n\n" +
            "# query {\n" +
            "#  allScaleLabels {\n" +
            "#    scale_id\n" +
            "#    label\n" +
            "#  }\n" +
            "}\n\n" +
            "query {\n" +
            "  allQuestionsAndPoints {\n" +
            "    q_id\n" +
            "    question\n" +
            "    points_type\n" +
            "    pointsA_not\n" +
            "    pointsB_only\n" +
            "    pointsC_sometimes\n" +
            "    pointsD_often\n" +
            "    pointsD_often\n" +
            "  }\n" +
            "}" 
    },
}));
// ISSUE shouldn't this above also be calling/opening the db connetion?

app.listen(4009);
console.log('Running a GraphQL API server at http://localhost:4009/graphql for Core Questions');