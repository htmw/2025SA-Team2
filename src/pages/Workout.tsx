import { useEffect, useState } from 'react';
import { getCurrentUser } from '@aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react';

interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl: string | null;
}

const client = generateClient<Schema>();

const RAPIDAPI_KEY = "1356ab160amsh9b6bfc5a92343aap16935ajsn3ccbef0df5fa";
const BASE_URL = "https://exercisedb.p.rapidapi.com";

function Workout() {
  const { user } = useAuthenticator((context) => [context.user]);
  const userId = user?.username || 'guest';
  const [loading, setLoading] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkouts() {
      setLoading(true);
      try {
        const currentUser = await getCurrentUser();
        const userID = currentUser.userId;

        const onboardingResult = await client.models.OnboardingData.list({
          filter: { userID: { eq: userID } }
        });

        if (!onboardingResult.data.length) {
          setError("No OnboardingData found for this user.");
          setLoading(false);
          return;
        }

        const userData = onboardingResult.data[0];
        const heightInInches = (userData.heightFeet ?? 0) * 12 + (userData.heightInches ?? 0);
        const weight = userData.weightLbs ?? 0;
        const bmi = heightInInches > 0 ? (weight / (heightInInches * heightInInches)) * 703 : 0;

        const equipment = mapEquipmentToName(userData.equipmentAvailable ?? 'none');
        const targetMuscles = mapGoalToMuscles(
          userData.fitnessGoalType ?? 'maintenance',
          bmi,
          userData.gender ?? '',
          userData.bodyType ?? '',
          userData.age ?? 25
        );
        const additionalMuscles = mapFitnessTypeToMuscles(userData.fitnessType ?? 'mixed');

        const allMuscles = Array.from(new Set([...targetMuscles, ...additionalMuscles]));
        const allFetchedExercises: Exercise[] = [];

        for (const muscle of allMuscles) {
          const url = `${BASE_URL}/exercises/target/${encodeURIComponent(muscle)}`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': "exercisedb.p.rapidapi.com"
            }
          });

          const data = await response.json();
          if (!Array.isArray(data)) continue;

          const filtered = data.filter((exercise: any) =>
            equipment.includes(exercise.equipment.toLowerCase())
          );

          const selected = filtered.length > 3 ? filtered.slice(0, 3) : filtered;

          allFetchedExercises.push(
            ...selected.map((ex: any) => ({
              id: ex.id,
              name: ex.name,
              description: `${ex.name} targets your ${ex.target} using ${ex.equipment}. ${ex.instructions?.[0] ?? 'Perform with control and proper form.'}`,
              videoUrl: ex.gifUrl || null
            }))
          );
        }

        const shuffled = allFetchedExercises.sort(() => 0.5 - Math.random());
        setAllExercises(shuffled);

        // Explanation message logic
        let messageParts: string[] = [];

        if (bmi < 18.5) {
          messageParts.push(`You are underweight (BMI: ${bmi.toFixed(1)}), so we included extra strength-focused exercises.`);
        } else if (bmi >= 25 && bmi < 30) {
          messageParts.push(`You are overweight (BMI: ${bmi.toFixed(1)}), so we added more cardio to support fat burning.`);
        } else if (bmi >= 30) {
          messageParts.push(`Your BMI is ${bmi.toFixed(1)} (obese range), so we included joint-friendly cardio and mobility exercises.`);
        }

        if (userData.gender === 'female') {
          messageParts.push(`We also focused more on glutes and hamstrings as common target areas for female users.`);
        } else if (userData.gender === 'male') {
          messageParts.push(`We emphasized chest and arms based on male strength training goals.`);
        }

        switch (userData.bodyType) {
          case 'ectomorph':
            messageParts.push(`As an ectomorph, we included compound lifts to help build lean muscle mass.`);
            break;
          case 'mesomorph':
            messageParts.push(`Since you're a mesomorph, your plan includes balanced strength and shaping exercises.`);
            break;
          case 'endomorph':
            messageParts.push(`Being an endomorph, we added metabolic conditioning to help with fat loss.`);
            break;
        }

        if ((userData.age ?? 0) >= 40) {
          messageParts.push(`Because you're over 40, we included mobility and core exercises to support long-term joint health.`);
        }

        setExplanation(messageParts.join(' '));

      } catch (err) {
        console.error(err);
        setError("Failed to fetch workout recommendations.");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkouts();
  }, []);

  function mapEquipmentToName(equipment: string): string[] {
    switch (equipment) {
      case 'none': return ['body weight'];
      case 'basic': return ['dumbbell', 'body weight'];
      case 'full': return ['barbell', 'dumbbell', 'body weight'];
      default: return ['body weight'];
    }
  }

  function mapGoalToMuscles(goal: string, bmi: number, gender: string, bodyType: string, age: number): string[] {
    const cardio = ['cardiovascular system', 'calves', 'quads'];
    const strength = ['biceps', 'triceps', 'pectorals', 'lats', 'delts'];
    const mobility = ['spine', 'abs', 'glutes'];
    const jointFriendly = ['abs', 'glutes', 'calves'];

    let baseMuscles: string[];

    switch (goal) {
      case 'weightLoss':
        baseMuscles = ['cardiovascular system', 'abs', 'quads', 'glutes', 'calves'];
        break;
      case 'muscleGain':
        baseMuscles = ['biceps', 'triceps', 'pectorals', 'lats', 'quads', 'glutes', 'delts'];
        break;
      case 'endurance':
        baseMuscles = ['calves', 'quads', 'glutes', 'abs', 'traps'];
        break;
      case 'maintenance':
        baseMuscles = ['abs', 'glutes', 'quads', 'biceps', 'delts'];
        break;
      default:
        baseMuscles = ['quads', 'abs', 'glutes'];
    }

    if (bmi < 18.5) baseMuscles.push(...strength);
    else if (bmi >= 25 && bmi < 30) baseMuscles.push(...cardio);
    else if (bmi >= 30) baseMuscles.push(...cardio, ...jointFriendly);

    if (gender === 'female') baseMuscles.push('glutes', 'hamstrings');
    else if (gender === 'male') baseMuscles.push('pectorals', 'biceps');

    switch (bodyType) {
      case 'ectomorph': baseMuscles.push('lats', 'quads', 'triceps'); break;
      case 'mesomorph': baseMuscles.push('delts', 'glutes'); break;
      case 'endomorph': baseMuscles.push('cardiovascular system', 'abs'); break;
    }

    if (age >= 40) baseMuscles.push(...mobility);

    return Array.from(new Set(baseMuscles));
  }

  function mapFitnessTypeToMuscles(fitnessType: string): string[] {
    switch (fitnessType) {
      case 'cardio': return ['cardiovascular system'];
      case 'strength': return ['quads', 'biceps', 'triceps', 'pectorals', 'lats'];
      case 'flexibility': return ['spine'];
      case 'mixed': return ['abs', 'quads', 'glutes', 'triceps'];
      default: return ['abs', 'quads'];
    }
  }

  const handleAddToRoutine = (exercise: Exercise) => {
    const existingWorkouts = JSON.parse(localStorage.getItem(`selectedWorkouts_${userId}`) || '[]');

    if (existingWorkouts.some((existing: Exercise) => existing.id === exercise.id)) {
      setPopupMessage("Already in your routine");
      setTimeout(() => setPopupMessage(null), 2000);
      return;
    }

    const updatedWorkouts = [...existingWorkouts, exercise];
    localStorage.setItem(`selectedWorkouts_${userId}`, JSON.stringify(updatedWorkouts));
    setAllExercises((prev) => prev.filter((ex) => ex.id !== exercise.id));
  };

  if (loading) return <div>Loading your recommended workout...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!allExercises.length) return <div>No recommended exercises found.</div>;

  return (
    <div style={{ padding: '1rem', textAlign: 'left', margin: '0', width: '100%' }}>
      <h2>Your Recommended Workout</h2>
      <p>Based on your quiz answers, here are some exercises you might try:</p>
      {explanation && (
        <div style={{ backgroundColor: '#e8f4fc', padding: '1rem', borderRadius: '10px', marginBottom: '1rem' }}>
          <strong>Why these workouts?</strong>
          <p>{explanation}</p>
        </div>
      )}
      {popupMessage && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#FF4D4D', color: 'white', padding: '10px 20px', borderRadius: '5px', zIndex: 1000 }}>
          {popupMessage}
        </div>
      )}
      <ul>
        {allExercises.map((ex) => (
          <li key={ex.id} style={{ marginBottom: "20px" }}>
            <strong>{ex.name}</strong>
            <p>{ex.description}</p>
            {ex.videoUrl ? (
              <img
                src={ex.videoUrl}
                alt={ex.name}
                width="360"
                height="200"
                style={{ objectFit: 'cover', borderRadius: '10px' }}
              />
            ) : (
              <p>No visual found</p>
            )}
            <br />
            <button
              onClick={() => handleAddToRoutine(ex)}
              style={{ marginTop: '10px', padding: '0.5rem 1rem', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
            >
              Add Workout to Routine
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Workout;