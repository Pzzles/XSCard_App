import { registerRootComponent } from 'expo';

import App from '../../App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

export type Contact = {
  id: number;
  name: string;
  position: string;
  company: string;
  dateAdded: string;
  image: any; // Consider using a more specific type for images
};

export type RootTabParamList = {
  Cards: undefined;
  Contacts: undefined;
};
