// Constants for API configuration
const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';
const API_KEY = '6b32c37bed784ca687a6920705bd3ab3';

// Types for API responses
interface SpoonacularNutrient {
  name: string;
  amount: number;
  unit: string;
}

interface DetailedNutritionPayload {
  nutrients: SpoonacularNutrient[];
}

// --- Updated DietPreferences Interface ---
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

  // Granular Nutrient Targets (matching the model)
  minCarbs?: number;
  maxCarbs?: number;
  minProtein?: number;
  maxProtein?: number;
  minCalories?: number;
  maxCalories?: number;
  minFat?: number;
  maxFat?: number;
  minFiber?: number;
  maxFiber?: number;
  minSugar?: number;
  maxSugar?: number;
  minSodium?: number;
  maxSodium?: number;
  minCalcium?: number;
  maxCalcium?: number;
  minIron?: number;
  maxIron?: number;
  minMagnesium?: number;
  maxMagnesium?: number;
  minPotassium?: number;
  maxPotassium?: number;
  minVitaminA?: number;
  maxVitaminA?: number;
  minVitaminC?: number;
  maxVitaminC?: number;
  minVitaminD?: number;
  maxVitaminD?: number;
  minVitaminE?: number;
  maxVitaminE?: number;
  // Add others corresponding to the model
}

interface MealPlanDay {
  meals: {
    id: number;
    title: string;
    image: string;
    imageType?: string; 
    readyInMinutes: number;
    // Allow nutrition to be our detailed type, null, or undefined
    nutrition?: NutritionInfo | null;
    // Add other fields from getRecipeDetails if needed
    sourceUrl?: string;
    summary?: string;
    instructions?: string; 
    analyzedInstructions?: unknown[];
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
  analyzedInstructions?: unknown[]; 
  nutrition?: DetailedNutritionPayload; // Use the payload type here
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
      const errorText = await response.text();
      throw new Error(`Spoonacular API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // --- Updated searchRecipes ---
  static async searchRecipes(preferences: DietPreferences) {
    const params: Record<string, string> = {
      number: '10', // Number of results
      addRecipeNutrition: 'true', // Get basic nutrition
      addRecipeInformation: 'true', // Get more info like ingredients, instructions links etc.
    };

    // --- Helper to add numeric preference if it exists ---
    const addNumericParam = (key: string, value?: number) => {
        if (value !== undefined && value !== null && !isNaN(value)) {
            params[key] = value.toString();
        }
    };

    // Existing params
    if (preferences.dietType && preferences.dietType !== 'none') {
      params.diet = preferences.dietType;
    }
    if (preferences.intolerances && preferences.intolerances.length > 0) {
      // Ensure values are lowercase strings as Spoonacular might expect
      params.intolerances = preferences.intolerances.map(i => String(i).toLowerCase()).join(',');
    }
     if (preferences.excludedIngredients && preferences.excludedIngredients.length > 0) {
        params.excludeIngredients = preferences.excludedIngredients.map(i => String(i).toLowerCase()).join(',');
    }
    addNumericParam('maxReadyTime', preferences.maxReadyTime);
    if (preferences.cuisinePreferences && preferences.cuisinePreferences.length > 0) {
      params.cuisine = preferences.cuisinePreferences.map(c => String(c).toLowerCase()).join(',');
    }

    // --- Add NEW Granular Nutrient Params ---
    addNumericParam('minCarbs', preferences.minCarbs);
    addNumericParam('maxCarbs', preferences.maxCarbs);
    addNumericParam('minProtein', preferences.minProtein);
    addNumericParam('maxProtein', preferences.maxProtein);
    addNumericParam('minCalories', preferences.minCalories);
    addNumericParam('maxCalories', preferences.maxCalories);
    addNumericParam('minFat', preferences.minFat);
    addNumericParam('maxFat', preferences.maxFat);
    addNumericParam('minFiber', preferences.minFiber);
    addNumericParam('maxFiber', preferences.maxFiber);
    addNumericParam('minSugar', preferences.minSugar);
    addNumericParam('maxSugar', preferences.maxSugar);
    addNumericParam('minSodium', preferences.minSodium);
    addNumericParam('maxSodium', preferences.maxSodium);
    addNumericParam('minCalcium', preferences.minCalcium);
    addNumericParam('maxCalcium', preferences.maxCalcium);
    addNumericParam('minIron', preferences.minIron);
    addNumericParam('maxIron', preferences.maxIron);
    addNumericParam('minMagnesium', preferences.minMagnesium);
    addNumericParam('maxMagnesium', preferences.maxMagnesium);
    addNumericParam('minPotassium', preferences.minPotassium);
    addNumericParam('maxPotassium', preferences.maxPotassium);
    addNumericParam('minVitaminA', preferences.minVitaminA);
    addNumericParam('maxVitaminA', preferences.maxVitaminA);
    addNumericParam('minVitaminC', preferences.minVitaminC);
    addNumericParam('maxVitaminC', preferences.maxVitaminC);
    addNumericParam('minVitaminD', preferences.minVitaminD);
    addNumericParam('maxVitaminD', preferences.maxVitaminD);
    addNumericParam('minVitaminE', preferences.minVitaminE);
    addNumericParam('maxVitaminE', preferences.maxVitaminE);
    // Add others as needed

    console.log("SpoonacularService: Searching recipes with params:", params); // Log params for debugging
    return this.fetchWithKey('/recipes/complexSearch', params);
  }

  // --- Updated getRecipeDetails ---
  // Ensure it fetches enough details for viewing health info/macros
  static async getRecipeDetails(recipeId: number): Promise<RecipeDetailsWithParsedNutrition> {
    const details: SpoonacularRecipeDetails = await this.fetchWithKey(`/recipes/${recipeId}/information`, {
      includeNutrition: 'true', // Already included, ensures nutrition data is fetched
      // addRecipeInstructions: 'true', // Consider adding if instructions are needed directly
    });
    const parsedNutrition = parseDetailedNutrition(details.nutrition);
    const restOfDetails = { ...details };
    delete restOfDetails.nutrition;
    return { ...restOfDetails, nutrition: parsedNutrition };
  }

  // --- Updated generateMealPlan ---
  static async generateMealPlan(preferences: DietPreferences) {
    console.log("SpoonacularService: Generating meal plan with preferences:", preferences);

    // --- Helper to add numeric preference if it exists ---
    const addNumericParam = (key: string, value?: number) => {
        if (value !== undefined && value !== null && !isNaN(value)) {
            params[key] = value.toString();
        }
    };
    
    const params: Record<string, string> = {
      timeFrame: 'week',
      // targetCalories can still be used as a primary guide
      targetCalories: preferences.caloriesPerDay?.toString() || '2000',
    };

    // Existing params
    if (preferences.dietType && preferences.dietType !== 'none') {
      params.diet = preferences.dietType;
    }
    if (preferences.excludedIngredients && preferences.excludedIngredients.length > 0) {
      params.exclude = preferences.excludedIngredients.map(i => String(i).toLowerCase()).join(',');
    }
    if (preferences.intolerances && preferences.intolerances.length > 0) {
       // Ensure values are lowercase strings
      params.intolerances = preferences.intolerances.map(i => String(i).toLowerCase()).join(',');
    }

  
    addNumericParam('minProtein', preferences.minProtein); // Use direct value if available
    addNumericParam('maxProtein', preferences.maxProtein);
    addNumericParam('minCarbs', preferences.minCarbs);
    addNumericParam('maxCarbs', preferences.maxCarbs);
    addNumericParam('minFat', preferences.minFat);
    addNumericParam('maxFat', preferences.maxFat);
    addNumericParam('minFiber', preferences.minFiber);
    addNumericParam('maxFiber', preferences.maxFiber);
    // Use explicit min/max if set, otherwise fall back to boolean flags if needed
    addNumericParam('maxSodium', preferences.maxSodium ?? (preferences.lowSodium ? 1500 : undefined));
    addNumericParam('maxSugar', preferences.maxSugar ?? (preferences.lowSugar ? 25 : undefined));
    // Add others if generateMealPlan endpoint supports them

    // --- DEBUG LOG for intolerances and other params ---
    console.log("SpoonacularService: Calling /mealplanner/generate with params:", JSON.stringify(params));

    try {
      const result = await this.fetchWithKey('/mealplanner/generate', params);
      console.log("SpoonacularService: Received raw meal plan structure:", result);
      
      // Process and slice the week data (existing logic to fetch details per meal)
      if (result.week) {
        const weekDays = Object.values(result.week) as MealPlanDay[];
        
        for (const day of weekDays) {
          const mealDetailPromises = day.meals.map(async (meal) => {
            try {
              // Fetch detailed info (calls updated getRecipeDetails)
              const detailedInfo = await this.getRecipeDetails(meal.id);
              // Return full meal object with detailed nutrition and other info from getRecipeDetails
              return { ...meal, ...detailedInfo }; // Combine original meal data with detailed info
            } catch (error) {
              console.error(`Failed to fetch details for meal ID ${meal.id}:`, error);
              return { ...meal, nutrition: null }; // Return original meal, mark nutrition null on error
            }
          });

          const mealsWithDetails = await Promise.all(mealDetailPromises);
          day.meals = mealsWithDetails;

         
          let dailyCalories = 0;
          let dailyProtein = 0;
          let dailyCarbs = 0;
          let dailyFat = 0;

          for (const meal of day.meals) {
            if (meal.nutrition) {
              dailyCalories += meal.nutrition.calories || 0;
              dailyProtein += meal.nutrition.protein || 0;
              dailyCarbs += meal.nutrition.carbs || 0;
              dailyFat += meal.nutrition.fat || 0;
            }
            // Fix image URLs (existing logic)
             if (meal.image && meal.imageType && !meal.image.startsWith('http')) {
                 // Use the specific image URL format if available
                 meal.image = `https://spoonacular.com/recipeImages/${meal.id}-312x231.${meal.imageType}`;
             } else if (meal.image && !meal.image.startsWith('http')) {
                // Fallback if imageType isn't present (less reliable)
                 meal.image = `https://img.spoonacular.com/recipes/${meal.image}`;
             }
          }

          day.nutrients = {
            calories: Math.round(dailyCalories),
            protein: Math.round(dailyProtein),
            carbs: Math.round(dailyCarbs),
            fat: Math.round(dailyFat)
          };
          // --- End of recalculation ---
        }
        
        // Slice to requested days (existing logic)
        const requestedDays = preferences.daysCount || 7;
        result.week = weekDays.slice(0, requestedDays); // Assign sliced array directly
      } else {
           result.week = []; // Ensure week is an empty array if not present
      }

      console.log("SpoonacularService: Processed meal plan with detailed nutrition:", result);
      return result;
    } catch (error) {
      console.error("SpoonacularService: Error generating or processing meal plan:", error);
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