import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  EditCard: { cardIndex: number };
  UnlockPremium: undefined;
  // ... other routes
};

export type EditCardScreenRouteProp = RouteProp<RootStackParamList, 'EditCard'>;
