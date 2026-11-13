import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import { WardrobeProvider } from './context/WardrobeContext';
import type { RootStackParamList } from './navigation/types';
import HomeScreen from './screens/HomeScreen';
import CosmicExploreScreen from './screens/CosmicExploreScreen';
import OutfitResultScreen from './screens/OutfitResultScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import RecognitionResultScreen from './screens/RecognitionResultScreen';
import UploadScreen from './screens/UploadScreen';
import WardrobeScreen from './screens/WardrobeScreen';
import { cosmicTheme } from './theme/cosmicTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <WardrobeProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            contentStyle: { backgroundColor: '#F3F6FA' },
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F3F6FA' },
            headerTintColor: '#18324B',
            headerTitleStyle: { fontWeight: '700' },
          }}
        >
          <Stack.Screen
            component={HomeScreen}
            name="Home"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            component={CosmicExploreScreen}
            name="CosmicExplore"
            options={{
              title: '宇宙探索',
              headerStyle: { backgroundColor: cosmicTheme.colors.deepSpace },
              headerTintColor: cosmicTheme.colors.textPrimary,
              contentStyle: { backgroundColor: cosmicTheme.colors.deepSpace },
              statusBarStyle: 'light',
            }}
          />
          <Stack.Screen
            component={WardrobeScreen}
            name="Wardrobe"
            options={{ title: '我的衣橱' }}
          />
          <Stack.Screen
            component={UploadScreen}
            name="Upload"
            options={{ title: '上传衣服' }}
          />
          <Stack.Screen
            component={ProcessingScreen}
            name="Processing"
            options={{
              gestureEnabled: false,
              headerBackVisible: false,
              title: 'AI 识别中',
            }}
          />
          <Stack.Screen
            component={RecognitionResultScreen}
            name="RecognitionResult"
            options={{ title: '识别结果确认' }}
          />
          <Stack.Screen
            component={OutfitResultScreen}
            name="OutfitResult"
            options={{ title: '智能穿搭结果' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </WardrobeProvider>
  );
}
