import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import './Quiz.css';

const client = generateClient<Schema>();

function Quiz() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    age: '',
    heightFeet: '5',
    heightInches: '0',
    weight: '',
    gender: '',
    bodyType: '',
    fitnessGoalType: '',
    fitnessType: '',
    workoutFrequency: '',
    preferredWorkoutTime: '',
    equipmentAvailable: '',
  });

  useEffect(() => {
    async function loadExistingData() {
      try {
        const currentUser = await getCurrentUser();
        const userID = currentUser.userId;

        const result = await client.models.OnboardingData.list({
          filter: { userID: { eq: userID } },
        });

        if (result.data.length > 0) {
          const existingData = result.data[0];
          setExistingRecordId(existingData.id);

          setFormData({
            age: existingData.age?.toString() || '',
            heightFeet: existingData.heightFeet?.toString() || '5',
            heightInches: existingData.heightInches?.toString() || '0',
            weight: existingData.weightLbs?.toString() || '',
            gender: existingData.gender || '',
            bodyType: existingData.bodyType || '',
            fitnessGoalType: existingData.fitnessGoalType || '',
            fitnessType: existingData.fitnessType || '',
            workoutFrequency: existingData.workoutFrequency || '',
            preferredWorkoutTime: existingData.preferredWorkoutTime || '',
            equipmentAvailable: existingData.equipmentAvailable || '',
          });
        }
      } catch (error) {
        console.error('Failed to load existing data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadExistingData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      const currentUser = await getCurrentUser();
      const userID = currentUser.userId;

      if (existingRecordId) {
        await client.models.OnboardingData.update({
          id: existingRecordId,
          userID,
          age: parseInt(formData.age, 10),
          heightFeet: parseInt(formData.heightFeet, 10),
          heightInches: parseInt(formData.heightInches, 10),
          weightLbs: parseFloat(formData.weight),
          gender: formData.gender,
          bodyType: formData.bodyType,
          fitnessGoalType: formData.fitnessGoalType,
          fitnessType: formData.fitnessType,
          workoutFrequency: formData.workoutFrequency,
          preferredWorkoutTime: formData.preferredWorkoutTime,
          equipmentAvailable: formData.equipmentAvailable,
        });
        console.log('Onboarding data updated!');
      } else {
        await client.models.OnboardingData.create({
          userID,
          age: parseInt(formData.age, 10),
          heightFeet: parseInt(formData.heightFeet, 10),
          heightInches: parseInt(formData.heightInches, 10),
          weightLbs: parseFloat(formData.weight),
          gender: formData.gender,
          bodyType: formData.bodyType,
          fitnessGoalType: formData.fitnessGoalType,
          fitnessType: formData.fitnessType,
          workoutFrequency: formData.workoutFrequency,
          preferredWorkoutTime: formData.preferredWorkoutTime,
          equipmentAvailable: formData.equipmentAvailable,
        });
        console.log('Onboarding data created!');
      }

      navigate('/workout');
    } catch (error) {
      console.error('Error saving quiz data:', error);
    }
  };

  if (loading) {
    return <div className="loading-container">Loading your data...</div>;
  }

  return (
    <div className="quiz-container">
      <div className="quiz-card">
        <h1 className="quiz-title">Let's Get Started</h1>
        
        {/* Progress Indicator */}
        <div className="progress-indicator">
          <div className={`progress-step ${step === 1 ? 'active' : ''}`}>Basic Info</div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step === 2 ? 'active' : ''}`}>Fitness Goals</div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step === 3 ? 'active' : ''}`}>Preferences</div>
        </div>

        {/* Step Content */}
        <div className="step-content">
          {step === 1 && (
            <>
              <h2 className="step-title">Basic Info</h2>
              
              <div className="form-field">
                <label htmlFor="age">Age <span className="required">*</span></label>
                <input 
                  type="number" 
                  id="age" 
                  name="age" 
                  value={formData.age} 
                  onChange={handleInputChange} 
                  className="input-field"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="height">Height <span className="required">*</span></label>
                <div className="height-container">
                  <div className="height-field">
                    <label htmlFor="heightFeet" className="sub-label">Feet</label>
                    <input 
                      type="number" 
                      id="heightFeet" 
                      name="heightFeet" 
                      value={formData.heightFeet} 
                      onChange={handleInputChange} 
                      className="input-field"
                    />
                  </div>
                  <div className="height-field">
                    <label htmlFor="heightInches" className="sub-label">Inches</label>
                    <input 
                      type="number" 
                      id="heightInches" 
                      name="heightInches" 
                      value={formData.heightInches} 
                      onChange={handleInputChange} 
                      className="input-field"
                    />
                  </div>
                </div>
              </div>
              
              <div className="form-field">
                <label htmlFor="weight">Weight (lbs) <span className="required">*</span></label>
                <input 
                  type="number" 
                  id="weight" 
                  name="weight" 
                  value={formData.weight} 
                  onChange={handleInputChange} 
                  className="input-field"
                />
              </div>
              
              <div className="form-field">
                <label htmlFor="gender">Gender <span className="required">*</span></label>
                <select 
                  id="gender" 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              
              <div className="form-field">
                <label htmlFor="bodyType">Body Type <span className="required">*</span></label>
                <select 
                  id="bodyType" 
                  name="bodyType" 
                  value={formData.bodyType} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Body Type</option>
                  <option value="ectomorph">Ectomorph</option>
                  <option value="mesomorph">Mesomorph</option>
                  <option value="endomorph">Endomorph</option>
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="step-title">Fitness Goals</h2>
              
              <div className="form-field">
                <label htmlFor="fitnessGoalType">Fitness Goal Type <span className="required">*</span></label>
                <select 
                  id="fitnessGoalType" 
                  name="fitnessGoalType" 
                  value={formData.fitnessGoalType} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Fitness Goal</option>
                  <option value="weightLoss">Weight Loss</option>
                  <option value="muscleGain">Muscle Gain</option>
                  <option value="endurance">Endurance</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              
              <div className="form-field">
                <label htmlFor="fitnessType">Fitness Type <span className="required">*</span></label>
                <select 
                  id="fitnessType" 
                  name="fitnessType" 
                  value={formData.fitnessType} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Fitness Type</option>
                  <option value="strength">Strength Training</option>
                  <option value="cardio">Cardio</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="step-title">Preferences</h2>
              
              <div className="form-field">
                <label htmlFor="workoutFrequency">Workout Frequency</label>
                <select 
                  id="workoutFrequency" 
                  name="workoutFrequency" 
                  value={formData.workoutFrequency} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Frequency</option>
                  <option value="1-2">1-2 days/week</option>
                  <option value="3-4">3-4 days/week</option>
                  <option value="5+">5+ days/week</option>
                </select>
              </div>
              
              <div className="form-field">
                <label htmlFor="preferredWorkoutTime">Preferred Workout Time</label>
                <select 
                  id="preferredWorkoutTime" 
                  name="preferredWorkoutTime" 
                  value={formData.preferredWorkoutTime} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Time</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
              
              <div className="form-field">
                <label htmlFor="equipmentAvailable">Equipment Available</label>
                <select 
                  id="equipmentAvailable" 
                  name="equipmentAvailable" 
                  value={formData.equipmentAvailable} 
                  onChange={handleInputChange} 
                  className="select-field"
                >
                  <option value="">Select Equipment</option>
                  <option value="none">No Equipment</option>
                  <option value="basic">Basic Home Equipment</option>
                  <option value="full">Full Gym Access</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="nav-buttons">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="back-button">
              Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="next-button">
              Next
            </button>
          ) : (
            <button onClick={handleSubmit} className="submit-button">
              Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Quiz;