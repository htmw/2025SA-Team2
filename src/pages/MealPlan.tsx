import React, {useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { SpoonacularService } from '../services/spoonacularService';
import { DIET_TYPES, INTOLERANCES, CUISINE_TYPES } from '../types/diet';
import { Card } from '@mui/material';
import { fetchUserAttributes } from 'aws-amplify/auth';

interface DietPreferences {
  dietType: string;
  intolerances: string[];
  excludedIngredients: string[];
  caloriesPerDay: number;
  proteinGramsPerDay: number;
  carbGramsPerDay: number;
  fatGramsPerDay: number;
  maxReadyTime: number;
  cuisinePreferences: string[];
  lowSodium: boolean;
  lowSugar: boolean;
  highProtein: boolean;
  mealsPerDay: number;
  daysCount?: number;
}

interface OnboardingData {
  userID: string;
  age: number | null;
  heightFeet: number | null;
  heightInches: number | null;
  weightLbs: number | null;
  gender: string | null;
  fitnessType: string | null;
  fitnessGoalType?: string | null;
}

interface MealPlanState {
  step: 'quiz' | 'plan';
  preferences: DietPreferences;
  mealPlan: MealPlanDay[];
  daysCount: number;
}

interface MealPlanDay {
  meals: {
  id: number;
    title: string;
    image: string;
    readyInMinutes: number;
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
  }[];
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

const client = generateClient<Schema>();

const MealPlan: React.FC = () => {
  const [state, setState] = useState<MealPlanState>({
    step: 'quiz',
    preferences: {
      dietType: 'none',
      intolerances: [],
      excludedIngredients: [],
      caloriesPerDay: 2000,
      proteinGramsPerDay: 150,
      carbGramsPerDay: 200,
      fatGramsPerDay: 65,
      maxReadyTime: 60,
      cuisinePreferences: [],
      lowSodium: false,
      lowSugar: false,
      highProtein: false,
      mealsPerDay: 3
    },
    mealPlan: [],
    daysCount: 7
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);

  // Add state for tracking saved preferences and meal plans
  const [savedPreferences, setSavedPreferences] = useState<boolean>(false);
  const [mealPlanDays, setMealPlanDays] = useState<MealPlanDay[]>([]);

  // Fetch onboarding data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user attributes...");
        const userAttributes = await fetchUserAttributes();
        const userId = userAttributes.sub;
        console.log("User ID:", userId);
        
        // Fetch onboarding data
        console.log("Querying OnboardingData from DynamoDB...");
        const onboardingResult = await client.models.OnboardingData.list({
          filter: { userID: { eq: userId } }
        });
        
        console.log("OnboardingData query result:", onboardingResult.data);
        
        if (onboardingResult.data && onboardingResult.data.length > 0) {
          console.log("Found onboarding data:", onboardingResult.data[0]);
          setOnboardingData(onboardingResult.data[0]);
          
          // Initialize certain preferences based on onboarding data
          // This will be overridden by saved preferences if they exist
          const userData = onboardingResult.data[0];
          
          // Calculate nutrition based on onboarding data
          if (userData.weightLbs) {
            const nutrition = calculateNutritionWithData(userData);
            if (nutrition) {
              setState(prev => ({
                ...prev,
                preferences: {
                  ...prev.preferences,
                  caloriesPerDay: nutrition.calories,
                  proteinGramsPerDay: nutrition.protein,
                  carbGramsPerDay: nutrition.carbs,
                  fatGramsPerDay: nutrition.fat
                }
              }));
            }
          }
          
        } else {
          console.log("No onboarding data found for this user");
        }
        
        // Now fetch any saved diet preferences
        console.log("Querying UserDietPreferences from DynamoDB...");
        const preferencesResult = await client.models.UserDietPreferences.list({
          filter: { userID: { eq: userId } }
        });
        
        console.log("UserDietPreferences query result:", preferencesResult.data);
        
        if (preferencesResult.data && preferencesResult.data.length > 0) {
          console.log("Found saved diet preferences:", preferencesResult.data[0]);
          
          // Use the most recent saved preferences
          const savedPrefs = preferencesResult.data[0];
          
          // Update the state with saved preferences
          setState(prev => ({
            ...prev,
            preferences: {
              dietType: savedPrefs.dietType || prev.preferences.dietType,
              intolerances: savedPrefs.intolerances || prev.preferences.intolerances,
              excludedIngredients: savedPrefs.excludedIngredients || prev.preferences.excludedIngredients,
              caloriesPerDay: savedPrefs.caloriesPerDay || prev.preferences.caloriesPerDay,
              proteinGramsPerDay: savedPrefs.proteinGramsPerDay || prev.preferences.proteinGramsPerDay,
              carbGramsPerDay: savedPrefs.carbGramsPerDay || prev.preferences.carbGramsPerDay,
              fatGramsPerDay: savedPrefs.fatGramsPerDay || prev.preferences.fatGramsPerDay,
              maxReadyTime: savedPrefs.maxReadyTime || prev.preferences.maxReadyTime,
              cuisinePreferences: savedPrefs.cuisinePreferences || prev.preferences.cuisinePreferences,
              lowSodium: savedPrefs.lowSodium || prev.preferences.lowSodium,
              lowSugar: savedPrefs.lowSugar || prev.preferences.lowSugar,
              highProtein: savedPrefs.highProtein || prev.preferences.highProtein,
              mealsPerDay: savedPrefs.mealsPerDay || prev.preferences.mealsPerDay
            }
          }));
        } else {
          console.log("No saved diet preferences found");
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };

    fetchUserData();
  }, []);

  // Calculate nutrition based on provided user data
  const calculateNutritionWithData = (userData: OnboardingData) => {
    console.log("Calculating nutrition with provided data:", userData);
    
    if (!userData.weightLbs) {
      console.log("No weight data available, returning null");
      return null;
    }

    // Extract and log values with defaults
    const weight = userData.weightLbs ?? 70; // Default weight in lbs
    const fitnessGoal = userData.fitnessGoalType?.toLowerCase() || 'maintenance';
    
    console.log("Using values:", {
      weight,
      fitnessGoal,
      weightSource: userData.weightLbs ? "user data" : "default",
      goalSource: userData.fitnessGoalType ? "user data" : "default"
    });
    
    // Calculate daily calories based on weight and fitness goal
    let dailyCalories = 0;
    switch (fitnessGoal) {
      case 'weightloss':
        dailyCalories = weight * 12;
        console.log(`Weight loss calculation: ${weight} × 12 = ${dailyCalories} calories`);
        break;
      case 'musclegain':
        dailyCalories = weight * 16;
        console.log(`Muscle gain calculation: ${weight} × 16 = ${dailyCalories} calories`);
        break;
      case 'maintenance':
      default:
        dailyCalories = weight * 15;
        console.log(`Maintenance calculation: ${weight} × 15 = ${dailyCalories} calories`);
        break;
    }
    
    // Calculate protein in grams
    const proteinGrams = weight * 0.82;
    console.log(`Protein calculation: ${weight} × 0.82 = ${proteinGrams}g`);
    
    // Calculate calories from protein (4 calories per gram)
    const proteinCalories = proteinGrams * 4;
    console.log(`Protein calories: ${proteinGrams}g × 4 = ${proteinCalories} calories`);
    
    // Allocate remaining calories to carbs (45%) and fats (55%)
    const remainingCalories = dailyCalories - proteinCalories;
    console.log(`Remaining calories: ${dailyCalories} - ${proteinCalories} = ${remainingCalories}`);
    
    const carbsPercentage = 0.45;
    const fatsPercentage = 0.55;
    
    const carbCalories = remainingCalories * carbsPercentage;
    const fatCalories = remainingCalories * fatsPercentage;
    
    console.log(`Carb calories: ${remainingCalories} × ${carbsPercentage} = ${carbCalories}`);
    console.log(`Fat calories: ${remainingCalories} × ${fatsPercentage} = ${fatCalories}`);
    
    // Convert calorie allocations to grams
    const carbGrams = carbCalories / 4; // 4 calories per gram of carbs
    const fatGrams = fatCalories / 9;   // 9 calories per gram of fat
    
    console.log(`Carb grams: ${carbCalories} ÷ 4 = ${carbGrams}g`);
    console.log(`Fat grams: ${fatCalories} ÷ 9 = ${fatGrams}g`);
    
    const result = {
      calories: Math.round(dailyCalories),
      protein: Math.round(proteinGrams),
      carbs: Math.round(carbGrams),
      fat: Math.round(fatGrams)
    };
    
    console.log("Final nutrition calculations:", result);
    
    return result;
  };

  // Calculate nutrition based on user's fitness data
  const calculateNutrition = () => {
    if (!onboardingData) {
      console.log("No onboarding data available, returning null");
      return null;
    }
    
    return calculateNutritionWithData(onboardingData);
  };

  // Function to save preferences to DynamoDB
  const savePreferencesToDynamoDB = async () => {
    try {
      const userAttributes = await fetchUserAttributes();
      const userId = userAttributes.sub;
      
      if (!userId) {
        setError('User ID not found');
        return;
      }

      await client.models.UserDietPreferences.create({
        userID: userId,
        ...state.preferences,
        lastUpdated: new Date().toISOString()
      });

      setSavedPreferences(true);
      setTimeout(() => setSavedPreferences(false), 3000);
    } catch (err) {
      setError('Failed to save preferences');
    }
  };

  // Add this section for the meal plan display
  const MealPlanDisplay = () => {
    if (loading) {
      return <div>Loading meal plan...</div>;
    }
    
    if (!mealPlanDays || !mealPlanDays.length) {
      return <div>No meal plan generated yet. Please go back and generate one.</div>;
    }

    return (
      <div className="meal-plan-display" style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2>Your {state.daysCount}-Day Meal Plan</h2>
          <button
            onClick={() => setState(prev => ({ ...prev, step: 'quiz' }))}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f5f5f5',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Adjust Preferences
          </button>
        </div>

        {/* Nutrition Summary */}
        <div className="nutrition-summary" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div className="nutrition-item">
            <h3>Daily Calories</h3>
            <div className="nutrition-circle">
              {state.preferences.caloriesPerDay}
            </div>
          </div>
          <div className="nutrition-item">
            <h3>Protein</h3>
            <div className="nutrition-circle">
              {state.preferences.proteinGramsPerDay}g
            </div>
          </div>
          <div className="nutrition-item">
            <h3>Carbs</h3>
            <div className="nutrition-circle">
              {state.preferences.carbGramsPerDay}g
            </div>
          </div>
          <div className="nutrition-item">
            <h3>Fat</h3>
            <div className="nutrition-circle">
              {state.preferences.fatGramsPerDay}g
            </div>
          </div>
        </div>
        
        {/* Daily Meal Plans */}
        {Array.isArray(mealPlanDays) && (
          <div className="meal-plan-days">
            {mealPlanDays.map((day, dayIndex) => (
              <Card key={dayIndex} style={{ marginBottom: '24px', padding: '16px' }}>
                <h3 style={{ marginBottom: '16px' }}>Day {dayIndex + 1}</h3>
                
                <div className="meals-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '16px'
                }}>
                  {Array.isArray(day.meals) && day.meals.map((meal) => (
                    <div key={meal.id} className="meal-card" style={{
                      border: '1px solid #eee',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <img 
                        src={meal.image} 
                        alt={meal.title}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{ padding: '16px' }}>
                        <h4>{meal.title}</h4>
                        <p>Ready in {meal.readyInMinutes} minutes</p>
                        <div className="meal-nutrition" style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '8px',
                          fontSize: '0.9em',
                          marginTop: '8px'
                        }}>
                          <div>Calories: {meal.nutrition?.calories || 0}</div>
                          <div>Protein: {meal.nutrition?.protein || 0}g</div>
                          <div>Carbs: {meal.nutrition?.carbs || 0}g</div>
                          <div>Fat: {meal.nutrition?.fat || 0}g</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Daily Nutrition Summary */}
                <div className="daily-nutrition" style={{
                  marginTop: '16px',
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <h4>Daily Totals</h4>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                    <div>Calories: {day.nutrients?.calories || 0}</div>
                    <div>Protein: {day.nutrients?.protein || 0}g</div>
                    <div>Carbs: {day.nutrients?.carbs || 0}g</div>
                    <div>Fat: {day.nutrients?.fat || 0}g</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Save Preferences Button */}
        <button
          onClick={savePreferencesToDynamoDB}
          style={{
            backgroundColor: savedPreferences ? '#4caf50' : '#3f51b5',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: '24px'
          }}
        >
          {savedPreferences ? 'Preferences Saved!' : 'Save Preferences'}
        </button>
      </div>
    );
  };

  // Add these additional preference options to the quiz section
  const AdditionalPreferences = () => (
    <>
      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Maximum Cooking Time (minutes)
        </label>
        <input
          type="number"
          value={state.preferences.maxReadyTime}
          onChange={(e) => setState(prev => ({
            ...prev,
            preferences: { ...prev.preferences, maxReadyTime: parseInt(e.target.value) }
          }))}
          style={{
            width: '100%',
            padding: '8px',
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Cuisine Preferences
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '8px'
        }}>
          {CUISINE_TYPES.map(cuisine => (
            <label key={cuisine.value} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                checked={state.preferences.cuisinePreferences.includes(cuisine.value)}
                onChange={(e) => {
                  const newCuisines = e.target.checked
                    ? [...state.preferences.cuisinePreferences, cuisine.value]
                    : state.preferences.cuisinePreferences.filter(c => c !== cuisine.value);
                  setState(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, cuisinePreferences: newCuisines }
                  }));
                }}
              />
              {cuisine.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="page-container">
      <h1 style={{
        fontSize: '2rem',
        marginBottom: '2rem',
        color: '#333'
      }}>Meal Plan Generator</h1>

      {state.step === 'quiz' ? (
        <div className="preferences-quiz" style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Dietary Preferences</h2>
          
          {onboardingData && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px',
              fontSize: '0.9rem'
            }}>
              <strong>Using your profile data:</strong> Your meal plan is being personalized using your 
              height ({onboardingData.heightFeet}'{onboardingData.heightInches}"), 
              weight ({onboardingData.weightLbs} lbs), 
              age ({onboardingData.age}), and 
              fitness goal ({onboardingData.fitnessGoalType || 'maintenance'}).
            </div>
          )}
          
          {/* Diet Type Selection */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Diet Type
            </label>
            <select
              value={state.preferences.dietType}
              onChange={(e) => setState(prev => ({
                ...prev,
                preferences: { ...prev.preferences, dietType: e.target.value }
              }))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            >
              {DIET_TYPES.map(diet => (
                <option key={diet.value} value={diet.value}>
                  {diet.label}
                </option>
              ))}
            </select>
          </div>

          {/* Intolerances Multi-Select */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Food Intolerances
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '8px'
            }}>
              {INTOLERANCES.map(intolerance => (
                <label key={intolerance.value} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <input
                    type="checkbox"
                    checked={state.preferences.intolerances.includes(intolerance.value)}
                    onChange={(e) => {
                      const newIntolerances = e.target.checked
                        ? [...state.preferences.intolerances, intolerance.value]
                        : state.preferences.intolerances.filter(i => i !== intolerance.value);
                      setState(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, intolerances: newIntolerances }
                      }));
                    }}
                  />
                  {intolerance.label}
                </label>
              ))}
            </div>
          </div>

          {/* Meal Plan Duration */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Meal Plan Duration (Days)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={state.daysCount}
              onChange={(e) => setState(prev => ({
                ...prev,
                daysCount: parseInt(e.target.value) || 7
              }))}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}
            />
          </div>

          {/* Informational note about meal count */}
          <div style={{
            backgroundColor: '#f0f0f0',
            padding: '10px',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.9em',
            color: '#555'
          }}>
            <strong>Note:</strong> Meal plans are generated with 3 meals per day (breakfast, lunch, dinner). The total daily nutritional targets are adjusted based on your profile and goals.
          </div>

          {/* Generate Button */}
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              
              try {
                console.log("Generating meal plan...");
                
                // Calculate initial nutrition values
                const nutrition = calculateNutrition();
                if (!nutrition) {
                  setError('Please complete your onboarding profile first');
                  setLoading(false);
                  return;
                }
                
                console.log("Calculated nutrition:", nutrition);
                
                // Update preferences with calculated nutrition values first
                const updatedPreferences: DietPreferences = {
                  ...state.preferences,
                  caloriesPerDay: nutrition.calories,
                  proteinGramsPerDay: nutrition.protein,
                  carbGramsPerDay: nutrition.carbs,
                  fatGramsPerDay: nutrition.fat,
                  daysCount: state.daysCount
                };
                
                console.log("Calling Spoonacular API with preferences:", updatedPreferences);
                
                // Call the API
                const mealPlan = await SpoonacularService.generateMealPlan(updatedPreferences);
                
                console.log("Received meal plan response:", mealPlan);
                
                // Check if response is valid
                if (!mealPlan) {
                  setError('Failed to generate meal plan. No response from API.');
                  setLoading(false);
                  return;
                }
                
                if (!mealPlan.week || !Array.isArray(mealPlan.week)) {
                  setError('Invalid meal plan data received from API.');
                  console.error('Invalid meal plan format:', mealPlan);
                  setLoading(false);
                  return;
                }
                
                // Update state only after successfully receiving data
                console.log("Setting meal plan days:", mealPlan.week);
                setMealPlanDays(mealPlan.week);
                
                // Then update overall state including step change
                console.log("Updating state and changing to plan view");
                setState(prev => ({ 
                  ...prev, 
                  preferences: updatedPreferences,
                  mealPlan: mealPlan.week,
                  step: 'plan' 
                }));
              } catch (err) {
                console.error('Error generating meal plan:', err);
                setError('Failed to generate meal plan: ' + (err instanceof Error ? err.message : 'Unknown error'));
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#ccc' : '#3f51b5',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            {loading ? 'Generating...' : 'Generate Meal Plan'}
          </button>

          <AdditionalPreferences />
          </div>
      ) : (
        <MealPlanDisplay />
      )}

      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '12px',
          borderRadius: '4px',
          marginTop: '16px'
        }}>
          {error}
          </div>
      )}
    </div>
  );
};

export default MealPlan; 