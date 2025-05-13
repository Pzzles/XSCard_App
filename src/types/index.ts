import { registerRootComponent } from 'expo';

import App from '../../App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

export type Contact = {
  id: number;
  name: string;
  surname: string;
  number: string;
  email?: string; 
  position: string;
  company: string;
  dateAdded: string;
  image: any; // Consider using a more specific type for images
};
export type AdminTabParamList = {
  Analytics: undefined;
  Calendar: undefined;
  Settings: undefined;
  Cards: undefined;
  SignIn: undefined;
  MainApp: undefined;
};

export type RootStackParamList = {
  MainTabs: undefined;
  AddCards: undefined;
  EditCard: undefined;
  UnlockPremium: undefined;
  AdminDashboard: undefined;
  SignIn: undefined;
  CardsScreen: undefined;
  Contacts: undefined;
  MainApp: undefined;
};

export type RootTabParamList = {
  Cards: undefined;
  Contacts: undefined;
};

export type AuthStackParamList = {
  Splash: undefined;
  SignIn: undefined;
  SignUp: undefined;
  CompleteProfile: { userId: string };
  MainApp: undefined;
  AdminDashboard: undefined;
};