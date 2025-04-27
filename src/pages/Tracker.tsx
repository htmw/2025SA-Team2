import React, { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from '@aws-amplify/ui-react';
import './Tracker.css';

const client = generateClient<Schema>();
const RAPIDAPI_KEY = "1356ab160amsh9b6bfc5a92343aap16935ajsn3ccbef0df5fa";
const BASE_URL = "https://exercisedb.p.rapidapi.com";

interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl: string | null;
}

const getWorkoutVideo = async (workoutName: string): Promise<string | null> => {
  try {
    const url = `${BASE_URL}/exercises/name/${encodeURIComponent(workoutName)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    const data = await response.json();
    return data[0]?.gifUrl || null; // Return the video URL or null if not found
  } catch (error) {
    console.error("Error fetching fresh video URL:", error);
    return null;
  }
};

function Tracker() {
  const { user } = useAuthenticator((context) => [context.user]); // Get authenticated user
  const userId = user?.username || 'guest'; // Use username or fallback to 'guest'

  const [showChoices, setShowChoices] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [workoutType, setWorkoutType] = useState<"cardio" | "strength" | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<Array<Schema["Tracker"]["type"]>>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Exercise[]>([]);

  useEffect(() => {
    const fetchUpdatedWorkouts = async () => {
      const savedWorkouts = JSON.parse(localStorage.getItem(`selectedWorkouts_${userId}`) || "[]");

      const updatedWorkouts = await Promise.all(
        savedWorkouts.map(async (workout: Exercise) => {
          // Always fetch a fresh video URL
          const freshUrl = await getWorkoutVideo(workout.name);
          return { ...workout, videoUrl: freshUrl };
        })
      );

      setSelectedWorkouts(updatedWorkouts);
      localStorage.setItem(`selectedWorkouts_${userId}`, JSON.stringify(updatedWorkouts));
    };

    fetchWorkoutHistory(); // Fetch workout history from the backend
    fetchUpdatedWorkouts(); // Always fetch fresh video URLs for the routine
  }, [userId]);

  const handleDeleteWorkout = (id: string) => {
    // Delete workout specific to the user
    const updatedWorkouts = selectedWorkouts.filter((workout) => workout.id !== id);
    setSelectedWorkouts(updatedWorkouts);
    localStorage.setItem(`selectedWorkouts_${userId}`, JSON.stringify(updatedWorkouts));
  };

  const handleButtonClick = () => {
    setShowChoices(true);
  };

  const deleteWorkout = async (id: string) => {
    try {
      await client.models.Tracker.delete({ id });
      fetchWorkoutHistory();
    } catch (error) {
      console.error("Error deleting workout:", error);
    }
  };

  const handleChoiceSelection = (type: "cardio" | "strength") => {
    setWorkoutType(type);
    setShowForm(true);
    setShowChoices(false);
  };

  const handleWorkoutSubmit = async (
    workout: string,
    calories: string,
    sets: string,
    date: string,
    weight?: string,
    reps?: string
  ) => {
    try {
      const newWorkout = {
        type: workoutType,
        workout: workout,
        duration: workoutType === "cardio" ? parseInt(sets) : undefined,
        sets: workoutType === "strength" ? parseInt(sets) : undefined,
        reps: workoutType === "strength" ? parseInt(reps || "0") : undefined,
        calories: parseInt(calories),
        date: date,
        weight: workoutType === "strength" ? parseFloat(weight || "0") : undefined,
      };
      await client.models.Tracker.create(newWorkout);
      setShowForm(false);
      setWorkoutType(null);
      fetchWorkoutHistory();
    } catch (error) {
      console.error("Error saving workout:", error);
    }
  };

  const fetchWorkoutHistory = async () => {
    try {
      const response = await client.models.Tracker.list({
        authMode: "userPool",
      });
      if (response.data) {
        const sortedData = response.data.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return dateB - dateA;
        });
        setWorkoutHistory(sortedData);
      } else {
        console.log("No data found in the response.");
      }
    } catch (error) {
      console.error("Error fetching workout history:", error);
    }
  };

  return (
    <main>
      {/* Buttons Section */}
      <div className={`button-section ${showForm ? 'form-open' : ''}`}>
        {!showChoices && !showForm && (
          <button onClick={handleButtonClick} className="button">
            Add a Workout
          </button>
        )}
        {showChoices && (
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => handleChoiceSelection('cardio')} className="button">
              Cardio
            </button>
            <button onClick={() => handleChoiceSelection('strength')} className="button">
              Strength
            </button>
          </div>
        )}
      </div>

      {showForm && workoutType === "cardio" && <CardioForm onSubmit={handleWorkoutSubmit} />}
      {showForm && workoutType === "strength" && <StrengthForm onSubmit={handleWorkoutSubmit} />}

      {/* Workout History Section */}
      <div className={`workout-history ${showForm ? 'shifted' : ''}`}>
        <h2 className="workout-history-title">Workout History</h2>
        <div className="workout-history-container">
          {workoutHistory
            .filter((workout) => workout !== null)
            .map((workout) => (
              <div key={workout.id} className="workout-card">
                <strong>Date:</strong> {workout.date || "N/A"} <br />
                <strong>Type:</strong> {workout.type || "N/A"} <br />
                <strong>Workout:</strong> {workout.workout || "N/A"} <br />
                {workout.type === "cardio" && (
                  <>
                    <strong>Duration:</strong> {workout.duration || "N/A"} minutes <br />
                  </>
                )}
                {workout.type === "strength" && (
                  <>
                    <strong>Sets:</strong> {workout.sets || "N/A"} <br />
                    <strong>Reps:</strong> {workout.reps || "N/A"} <br />
                    <strong>Weight:</strong> {workout.weight || "N/A"} lbs <br />
                  </>
                )}
                <strong>Calories Burned:</strong> {workout.calories || "N/A"} <br />
                <button onClick={() => deleteWorkout(workout.id)} className="button-red">
                  Delete
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Routine Section */}
      <div className="routine-container">
        <h2 className="routine-title">Your Routine</h2>
        {selectedWorkouts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {selectedWorkouts.map((workout) => (
              <div key={workout.id} className="routine-card">
                <h3 className="routine-card-title">{workout.name}</h3>
                <p className="routine-card-description">{workout.description}</p>
                {workout.videoUrl ? (
                  <img
                    src={workout.videoUrl}
                    alt={workout.name}
                    width="100%"
                    height="300"
                    className="routine-card-image"
                  />
                ) : (
                  <p className="routine-card-no-visual">No visual found</p>
                )}
                <button onClick={() => handleDeleteWorkout(workout.id)} className="button-red">
                  Remove from Routine
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "#555" }}>No workouts selected.</p>
        )}
      </div>
    </main>
  );
}

interface WorkoutFormProps {
  onSubmit: (
    workout: string,
    calories: string,
    setsOrDuration: string,
    date: string,
    weight?: string,
    reps?: string
  ) => Promise<void>;
}

const CardioForm: React.FC<WorkoutFormProps> = ({ onSubmit }) => {
  const [workout, setWorkout] = useState('');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [date, setDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(workout, calories, duration, date);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px', // Reduced gap
        padding: '15px', // Reduced padding
        border: '1px solid #ddd',
        borderRadius: '8px', // Slightly smaller border radius
        backgroundColor: '#f9f9f9',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', // Reduced shadow
        maxWidth: '350px', // Reduced max width
        margin: '0 auto',
      }}
    >
      <h3 style={{ textAlign: 'center', color: '#333', fontSize: '20px' }}>Add Cardio Workout</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Workout:
        <input
          type="text"
          value={workout}
          onChange={(e) => setWorkout(e.target.value)}
          placeholder="e.g., Running, Cycling"
          style={{
            padding: '8px', // Reduced padding
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '15px', // Reduced font size
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Duration (minutes):
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g., 30"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Calories Burned:
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="e.g., 300"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Date:
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <button
        type="submit"
        style={{
          padding: '8px 15px', // Reduced padding
          backgroundColor: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px', 
        }}
      >
        Submit
      </button>
    </form>
  );
};

const StrengthForm: React.FC<WorkoutFormProps> = ({ onSubmit }) => {
  const [workout, setWorkout] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [calories, setCalories] = useState('');
  const [date, setDate] = useState('');
  const [weight, setWeight] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(workout, calories, sets, date, weight, reps);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '15px',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        maxWidth: '350px',
        margin: '0 auto',
      }}
    >
      <h3 style={{ textAlign: 'center', color: '#333', fontSize: '20px' }}>Add Strength Workout</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Workout:
        <input
          type="text"
          value={workout}
          onChange={(e) => setWorkout(e.target.value)}
          placeholder="e.g., Bench Press, Deadlift"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Sets:
        <input
          type="number"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          placeholder="e.g., 3"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Reps:
        <input
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="e.g., 10"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Weight (lbs):
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g., 50"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Calories Burned:
        <input
          type="number"
          value={calories}
          onChange={(e) => setCalories(e.target.value)}
          placeholder="e.g., 200"
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: '#555', fontSize: '18px' }}>
        Date:
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            fontSize: '13px',
          }}
        />
      </label>
      <button
        type="submit"
        style={{
          padding: '8px 15px',
          backgroundColor: '#007BFF',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Submit
      </button>
    </form>
  );
};

export default Tracker;