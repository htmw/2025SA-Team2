// Constants for API configuration
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';
const API_KEY = 'd6d5112d9af948238044cc6c2eaa5c44';

// Types for API responses
interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
  // other potential properties...
}

interface DetailedNutritionPayload {
  nutrients: SpoonacularNutrient[];
  // other properties...
}

interface DietPreferences {
  dietType: string;
  intolerances?: string[];
  excludedIngredients?: string[];
  caloriesPerDay?: number;
  proteinGramsPerDay?: number;
  carbGramsPerDay?: number;
  fatGramsPerDay?: number;
  maxReadyTime?: number;
  cuisinePreferences?: string[];
  lowSodium?: boolean;
  lowSugar?: boolean;
  highProtein?: boolean;
  mealsPerDay: number;
  daysCount?: number;
}

interface MealPlanDay {
  meals: {
    id: number;
    title: string;
    image: string;
    readyInMinutes: number;
    // Allow nutrition to be our detailed type, null, or undefined
    nutrition?: NutritionInfo | null;
  }[];
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Interface for the basic recipe details from Spoonacular
interface SpoonacularRecipeDetails {
  id: number;
  title: string;
  image?: string;
  imageType?: string;
  readyInMinutes?: number;
  servings?: number;
  sourceUrl?: string;
  summary?: string;
  instructions?: string;
  analyzedInstructions?: any[]; // Keep as any for now, structure varies
  nutrition?: DetailedNutritionPayload; // Use the payload type here
  // Add other relevant fields as needed
}

// Interface for our combined return type
interface RecipeDetailsWithParsedNutrition extends Omit<SpoonacularRecipeDetails, 'nutrition'> {
  nutrition: NutritionInfo | null; // Our parsed nutrition type
}

// Helper function to parse detailed nutrition data
function parseDetailedNutrition(nutritionData: DetailedNutritionPayload | null | undefined): NutritionInfo | null {
  if (!nutritionData || !Array.isArray(nutritionData.nutrients)) {
    return null;
  }

  const findNutrient = (name: string): number => 
    nutritionData.nutrients.find((n: SpoonacularNutrient) => n.name === name)?.amount || 0;

  return {
    calories: Math.round(findNutrient('Calories')),
    protein: Math.round(findNutrient('Protein')),
    carbs: Math.round(findNutrient('Carbohydrates')),
    fat: Math.round(findNutrient('Fat')),
  };
}

// Main service class
export class SpoonacularService {
  private static async fetchWithKey(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({
      ...params,
      apiKey: API_KEY,
    });

    const response = await fetch(
      `${SPOONACULAR_BASE_URL}${endpoint}?${queryParams.toString()}`
    );

    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Search recipes based on user preferences
  static async searchRecipes(preferences: DietPreferences) {
    const params: Record<string, string> = {
      number: '10', // Number of results to return
      addRecipeNutrition: 'true',
    };

    if (preferences.dietType && preferences.dietType !== 'none') {
      params.diet = preferences.dietType;
    }

    if (preferences.intolerances && preferences.intolerances.length > 0) {
      params.intolerances = preferences.intolerances.join(',');
    }

    if (preferences.maxReadyTime) {
      params.maxReadyTime = preferences.maxReadyTime.toString();
    }

    if (preferences.cuisinePreferences && preferences.cuisinePreferences.length > 0) {
      params.cuisine = preferences.cuisinePreferences.join(',');
    }

    // Add calorie range if specified
    if (preferences.caloriesPerDay) {
      const caloriesPerMeal = Math.round(preferences.caloriesPerDay / preferences.mealsPerDay);
      params.minCalories = (caloriesPerMeal * 0.9).toString(); // 10% margin
      params.maxCalories = (caloriesPerMeal * 1.1).toString(); // 10% margin
    }

    return this.fetchWithKey('/recipes/complexSearch', params);
  }

  // Get detailed recipe information including nutrition
  static async getRecipeDetails(recipeId: number): Promise<RecipeDetailsWithParsedNutrition> {
    const details: SpoonacularRecipeDetails = await this.fetchWithKey(`/recipes/${recipeId}/information`, {
      includeNutrition: 'true',
    });
    // Parse the nutrition part of the response
    const parsedNutrition = parseDetailedNutrition(details.nutrition);
    
    // Create a copy of details to modify
    const restOfDetails = { ...details };
    // Remove the original nutrition property
    delete restOfDetails.nutrition;

    // Construct the final return object
    return { ...restOfDetails, nutrition: parsedNutrition };
  }

  // Generate a meal plan based on preferences
  static async generateMealPlan(preferences: DietPreferences) {
    console.log("SpoonacularService: Generating meal plan with preferences:", preferences);
    
    const params: Record<string, string> = {
      timeFrame: 'week', // Changed from 'day' to 'week' to get weekly meal plan
      targetCalories: preferences.caloriesPerDay?.toString() || '2000',
    };

    // Diet type (vegetarian, vegan, etc.)
    if (preferences.dietType && preferences.dietType !== 'none') {
      params.diet = preferences.dietType;
    }

    // Excluded ingredients
    if (preferences.excludedIngredients && preferences.excludedIngredients.length > 0) {
      params.exclude = preferences.excludedIngredients.join(',');
    }
    
    // Add intolerances if specified
    if (preferences.intolerances && preferences.intolerances.length > 0) {
      params.intolerances = preferences.intolerances.join(',');
    }
    
    // Add extra nutrition parameters for better targeting
    if (preferences.highProtein === true && preferences.proteinGramsPerDay) {
      params.minProtein = Math.round(preferences.proteinGramsPerDay * 0.9).toString(); // 90% of target
    }
    
    if (preferences.lowSodium === true) {
      params.maxSodium = '1500'; // 1500mg is considered low sodium
    }
    
    if (preferences.lowSugar === true) {
      params.maxSugar = '25'; // 25g is considered low sugar
    }

    try {
      const result = await this.fetchWithKey('/mealplanner/generate', params);
      console.log("SpoonacularService: Received meal plan:", result);
      
      // Process and slice the week data
      if (result.week) {
        let weekDays = Object.values(result.week) as MealPlanDay[];
        
        // Process nutrition for all fetched days
        for (const day of weekDays) {
          // Create an array of promises to fetch detailed nutrition for each meal
          const mealDetailPromises = day.meals.map(async (meal) => {
            try {
              // Fetch detailed info
              const detailedInfo = await this.getRecipeDetails(meal.id);
              // Update the meal object with the parsed nutrition, keeping other properties
              return { ...meal, nutrition: detailedInfo.nutrition }; 
            } catch (error) {
              console.error(`Failed to fetch details for meal ID ${meal.id}:`, error);
              // Return the original meal object if fetching details fails
              return meal; 
            }
          });

          // Wait for all detail fetches to complete for the day
          const mealsWithDetails = await Promise.all(mealDetailPromises);
          
          // Update the day's meals with the detailed information
          day.meals = mealsWithDetails;

          // --- Recalculate daily totals based on detailed meal nutrition ---
          let dailyCalories = 0;
          let dailyProtein = 0;
          let dailyCarbs = 0;
          let dailyFat = 0;

          for (const meal of day.meals) {
            if (meal.nutrition) { // Check if detailed nutrition exists
              dailyCalories += meal.nutrition.calories || 0;
              dailyProtein += meal.nutrition.protein || 0;
              dailyCarbs += meal.nutrition.carbs || 0;
              dailyFat += meal.nutrition.fat || 0;
            }

            // Fix image URLs (can be done here)
            if (meal.image && !meal.image.startsWith('http')) {
              meal.image = `https://spoonacular.com/recipeImages/${meal.image}`;
            }
          }
          
          // Update the day's nutrients totals with the recalculated values
          day.nutrients = {
            calories: Math.round(dailyCalories),
            protein: Math.round(dailyProtein),
            carbs: Math.round(dailyCarbs),
            fat: Math.round(dailyFat)
          };
          // --- End of recalculation ---
        }
        
        // Slice the array to the requested number of days
        const requestedDays = preferences.daysCount || 7; // Default to 7 if not provided
        weekDays = weekDays.slice(0, requestedDays);

        // Update the result with the sliced array
        result.week = weekDays;
      }
      
      return result;
    } catch (error) {
      console.error("SpoonacularService: Error generating meal plan:", error);
      throw error;
    }
  }

  // Get recipe substitutes for ingredients
  static async getIngredientSubstitutes(ingredient: string) {
    return this.fetchWithKey('/food/ingredients/substitutes', {
      ingredientName: ingredient,
    });
  }

  // Analyze recipe nutrition
  static async analyzeRecipeNutrition(recipeId: number): Promise<NutritionInfo> {
    return this.fetchWithKey(`/recipes/${recipeId}/nutritionWidget.json`);
  }
} 