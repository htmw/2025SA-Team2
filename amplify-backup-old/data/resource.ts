import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

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
  // Any other models (like Todo) can be here too
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool", 
  },
});
