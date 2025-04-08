import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any user authenticated via an API key can "create", "read",
"update", and "delete" any "Todo" records.
=========================================================================*/
const schema = a.schema({
  OnboardingData: a.model({
    userID: a.string().required(),
    age: a.integer(),
    heightFeet: a.integer(),
    heightInches: a.integer(),
    weightLbs: a.float(),
    gender: a.string(),
    bodyType: a.string(),
    fitnessGoalType: a.string(),
    fitnessType: a.string(),
    workoutFrequency: a.string(),
    preferredWorkoutTime: a.string(),
    equipmentAvailable: a.string(),
  }).authorization(allow => [allow.owner()]),

  Tracker: a.model({
    type: a.string(), // "cardio" or "strength"
    workout: a.string().required(), // e.g., "Running", "Bench Press"
    duration: a.integer(), // Only for cardio
    sets: a.integer(), // Only for strength
    reps: a.integer(), // Only for strength
    calories: a.integer().required(),
    date: a.date().required(),
    weight: a.float(),
    })
    .authorization(allow => [allow.owner()]), // Restrict access to the owner
  
  CognitoUser: a.model({
    username: a.string().required(),
    email: a.string(),
    enabled: a.boolean(),
    userStatus: a.string(),
    userCreateDate: a.string(),
    userLastModifiedDate: a.string(),
    lastUpdated: a.string(),
  }).authorization(allow => [
    // Only admin users can access this table
    allow.groups(['admin']),
  ]),

  UserDietPreferences: a.model({
    userID: a.string().required(),
    
    // Diet Types
    dietType: a.string(), // e.g., "vegetarian", "vegan", "paleo", "ketogenic"
    
    // Intolerances/Allergies (Multiple)
    intolerances: a.string().array(), // e.g., ["dairy", "gluten", "peanut"]
    
    // Excluded Ingredients
    excludedIngredients: a.string().array(), // Foods they don't like or want to avoid
    
    // Nutritional Targets
    caloriesPerDay: a.integer(),
    proteinGramsPerDay: a.integer(),
    carbGramsPerDay: a.integer(),
    fatGramsPerDay: a.integer(),
    
    // Meal Preferences
    maxReadyTime: a.integer(), // Maximum cooking time in minutes
    cuisinePreferences: a.string().array(), // e.g., ["italian", "mexican", "indian"]
    
    // Custom Flags
    lowSodium: a.boolean(),
    lowSugar: a.boolean(),
    highProtein: a.boolean(),
    
    // Meal Count
    mealsPerDay: a.integer(),
    
    // Last Updated
    lastUpdated: a.string()
  }).authorization(allow => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
