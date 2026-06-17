import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import QuizScreen from './src/screens/QuizScreen';
import ChatScreen from './src/screens/ChatScreen';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import LevelSelectScreen from './src/screens/LevelSelectScreen';

import { useAuthStore } from './src/store/authStore';

export type RootStackParamList = {
  Home: undefined;
  Quiz: { 
    initialDifficulty?: 'Beginner' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
    mode?: 'normal' | 'review_incorrect' | 'review_today';
  } | undefined;
  Chat: undefined;
  Login: undefined;
  LevelSelect: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { user, token, checkAuth, isLoading } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check authentication on app start
    checkAuth().finally(() => {
      // Force splash screen to show for at least 2 seconds for the animation
      setTimeout(() => setShowSplash(false), 2000);
    });
  }, []);

  if (showSplash || isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator 
        screenOptions={{
          headerTransparent: true,
          headerBlurEffect: 'light',
          headerTintColor: '#111827',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 18,
          },
          contentStyle: {
            backgroundColor: '#F9FAFB',
          }
        }}
      >
        {(!token || !user) ? (
          // Not logged in
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
        ) : !user.difficulty ? (
          // Logged in but no difficulty selected
          <Stack.Screen 
            name="LevelSelect" 
            component={LevelSelectScreen} 
            options={{ headerShown: false }} 
          />
        ) : (
          // Fully setup user
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ title: 'Japeak' }} 
            />
            <Stack.Screen 
              name="Quiz" 
              component={QuizScreen} 
              options={{ title: '단어 학습', headerBackTitle: '홈' }} 
            />
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen} 
              options={{ title: 'AI 회화 연습' }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
