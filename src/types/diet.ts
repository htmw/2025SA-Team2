export interface DietPreferences {
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
}

export const DIET_TYPES = [
  { value: 'none', label: 'No Specific Diet' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'ketogenic', label: 'Ketogenic' },
  { value: 'pescetarian', label: 'Pescetarian' },
  { value: 'primal', label: 'Primal' }
];

export const INTOLERANCES = [
  { value: 'dairy', label: 'Dairy' },
  { value: 'egg', label: 'Egg' },
  { value: 'gluten', label: 'Gluten' },
  { value: 'grain', label: 'Grain' },
  { value: 'peanut', label: 'Peanut' },
  { value: 'seafood', label: 'Seafood' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'soy', label: 'Soy' },
  { value: 'sulfite', label: 'Sulfite' },
  { value: 'tree_nut', label: 'Tree Nut' },
  { value: 'wheat', label: 'Wheat' }
];

export const CUISINE_TYPES = [
  { value: 'african', label: 'African' },
  { value: 'american', label: 'American' },
  { value: 'british', label: 'British' },
  { value: 'cajun', label: 'Cajun' },
  { value: 'caribbean', label: 'Caribbean' },
  { value: 'chinese', label: 'Chinese' },
  { value: 'european', label: 'European' },
  { value: 'french', label: 'French' },
  { value: 'german', label: 'German' },
  { value: 'greek', label: 'Greek' },
  { value: 'indian', label: 'Indian' },
  { value: 'italian', label: 'Italian' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'korean', label: 'Korean' },
  { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'mexican', label: 'Mexican' },
  { value: 'middle_eastern', label: 'Middle Eastern' },
  { value: 'thai', label: 'Thai' },
  { value: 'vietnamese', label: 'Vietnamese' }
]; 