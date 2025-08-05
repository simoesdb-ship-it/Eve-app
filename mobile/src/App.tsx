import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Screens
import DiscoverScreen from './screens/DiscoverScreen';
import PatternsScreen from './screens/PatternsScreen';
import ActivityScreen from './screens/ActivityScreen';
import CommunicationScreen from './screens/CommunicationScreen';
import EconomyScreen from './screens/EconomyScreen';

// Services
import { LocationTrackingProvider } from './services/LocationTrackingService';
import { AuthProvider } from './services/AuthService';
import { WebSocketProvider } from './services/WebSocketService';

const Tab = createBottomTabNavigator();

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LocationTrackingProvider>
        <WebSocketProvider>
          <NavigationContainer>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName: string;

                  switch (route.name) {
                    case 'Discover':
                      iconName = 'explore';
                      break;
                    case 'Patterns':
                      iconName = 'pattern';
                      break;
                    case 'Activity':
                      iconName = 'timeline';
                      break;
                    case 'Communication':
                      iconName = 'message';
                      break;
                    case 'Economy':
                      iconName = 'account-balance-wallet';
                      break;
                    default:
                      iconName = 'help';
                  }

                  return <Icon name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2563eb',
                tabBarInactiveTintColor: '#6b7280',
                tabBarStyle: {
                  backgroundColor: '#ffffff',
                  borderTopWidth: 1,
                  borderTopColor: '#e5e7eb',
                  height: 60,
                  paddingBottom: 8,
                  paddingTop: 8,
                },
                headerStyle: {
                  backgroundColor: '#ffffff',
                  borderBottomWidth: 1,
                  borderBottomColor: '#e5e7eb',
                },
                headerTitleStyle: {
                  color: '#111827',
                  fontSize: 18,
                  fontWeight: '600',
                },
              })}
            >
              <Tab.Screen 
                name="Discover" 
                component={DiscoverScreen}
                options={{ title: 'Discover Patterns' }}    
              />
              <Tab.Screen 
                name="Patterns" 
                component={PatternsScreen}
                options={{ title: 'My Patterns' }}
              />
              <Tab.Screen 
                name="Activity" 
                component={ActivityScreen}
                options={{ title: 'Activity Feed' }}
              />
              <Tab.Screen 
                name="Communication" 
                component={CommunicationScreen}
                options={{ title: 'Messages' }}
              />
              <Tab.Screen 
                name="Economy" 
                component={EconomyScreen}
                options={{ title: 'Token Wallet' }}
              />
            </Tab.Navigator>
          </NavigationContainer>
        </WebSocketProvider>
      </LocationTrackingProvider>
    </AuthProvider>
  );
};

export default App;