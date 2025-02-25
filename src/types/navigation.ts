import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Home: undefined;
  EditCard: { cardIndex: number };
  // ... other routes
};

export type EditCardScreenRouteProp = RouteProp<RootStackParamList, 'EditCard'>;
