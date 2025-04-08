import React, { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { useAuthenticator } from '@aws-amplify/ui-react';

const client = generateClient<Schema>();

interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl: string | null;
}

function Tracker() {
  const { user } = useAuthenticator((context) => [context.user]); // Get authenticated user
  const userId = user?.username || 'guest'; // Use username or fallback to 'guest'

  const [showChoices, setShowChoices] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [workoutType, setWorkoutType] = useState<"cardio" | "strength" | null>(null);
  const [workoutHistory, setWorkoutHistory] = useState<Array<Schema["Tracker"]["type"]>>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Exercise[]>([]);

  useEffect(() => {
    fetchWorkoutHistory();

    // Load workouts specific to the user
    const savedWorkouts = localStorage.getItem(`selectedWorkouts_${userId}`);
    if (savedWorkouts) {
      setSelectedWorkouts(JSON.parse(savedWorkouts));
    }
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
        {!showChoices && !showForm && (
          <button
            onClick={handleButtonClick}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#007BFF",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Add a Workout
          </button>
        )}

        {showChoices && (
          <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
            <button onClick={() => handleChoiceSelection("cardio")}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#007BFF",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}>Cardio</button>
            <button onClick={() => handleChoiceSelection("strength")}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#007BFF",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontSize: "16px",
              }}>Strength</button>
          </div>
        )}

        {showForm && workoutType === "cardio" && <CardioForm onSubmit={handleWorkoutSubmit} />}
        {showForm && workoutType === "strength" && <StrengthForm onSubmit={handleWorkoutSubmit} />}
      </div>

      {/* Workout History Section */}
      {workoutHistory.length > 0 && (
        <div
          style={{
            marginTop: "20px",

          }}
        >
          <h2>Workout History</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "20px",
              overflowX: "auto", // Enable horizontal scrolling if needed
              padding: "10px",
            }}
          >
            {workoutHistory
              .filter((workout) => workout !== null)
              .map((workout) => (
                <div
                  key={workout.id}
                  style={{
                    minWidth: "250px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    padding: "10px",
                    backgroundColor: "#fff",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  }}
                >
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
                  <button
                    onClick={() => deleteWorkout(workout.id)}
                    style={{
                      marginTop: "10px",
                      padding: "0.5rem 1rem",
                      backgroundColor: "#FF4D4D",
                      color: "white",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Routine Section */}
      <div style={{ padding: "1rem" }}>
        <h2>Your Routine</h2>
        {selectedWorkouts.length > 0 ? (
          <ul>
            {selectedWorkouts.map((workout) => (
              <li key={workout.id} style={{ marginBottom: "20px" }}>
                <strong>{workout.name}</strong>
                <p>{workout.description}</p>
                {workout.videoUrl ? (
                  <img
                    src={workout.videoUrl}
                    alt={workout.name}
                    width="360"
                    height="200"
                    style={{ objectFit: "cover", borderRadius: "10px" }}
                  />
                ) : (
                  <p>No visual found</p>
                )} <br />
                <button
                  onClick={() => handleDeleteWorkout(workout.id)}
                  style={{
                    marginTop: "10px",
                    padding: "0.5rem 1rem",
                    backgroundColor: "#FF4D4D",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }} 
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No workouts selected.</p>
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
  const [date, setDate] = useState(''); // Add date state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(workout, calories, duration, date); // Pass date to onSubmit
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Workout:
          <input
            type="text"
            value={workout}
            onChange={(e) => setWorkout(e.target.value)}
            placeholder="e.g., Running, Cycling"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Duration (minutes):
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g., 30"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Calories Burned:
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g., 300"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Date:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <button type="submit"
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}>Submit</button>
      </div>
    </form>
  );
};

const StrengthForm: React.FC<WorkoutFormProps> = ({ onSubmit }) => {
  const [workout, setWorkout] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [calories, setCalories] = useState('');
  const [date, setDate] = useState(''); // Add date state
  const [weight, setWeight] = useState(''); // Add weight state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(workout, calories, sets, date, weight, reps); // Pass reps as a separate argument
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Workout:
          <input
            type="text"
            value={workout}
            onChange={(e) => setWorkout(e.target.value)}
            placeholder="e.g., Bench Press, Deadlift"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Sets:
          <input
            type="number"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
            placeholder="e.g., 3"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Reps:
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="e.g., 10"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Weight (lbs):
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g., 50"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Calories Burned:
          <input
            type="number"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            placeholder="e.g., 200"
          />
        </label>
      </div>
      <div>
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', color: 'black', fontSize: '20px', fontWeight: 'bold' }}>
          Date:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <button type="submit"
        style={{
          padding: "0.75rem 1.5rem",
          backgroundColor: "#007BFF",
          color: "white",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          fontSize: "16px",
        }}>Submit</button>
      </div>
    </form>
  );
};

export default Tracker;