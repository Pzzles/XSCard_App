import { ImagePickerAsset, launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export const requestPermissions = async () => {
  try {
    const cameraPermission = await requestCameraPermissionsAsync();
    const galleryPermission = await requestMediaLibraryPermissionsAsync();
    
    return {
      cameraGranted: cameraPermission.status === 'granted',
      galleryGranted: galleryPermission.status === 'granted',
    };
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return {
      cameraGranted: false,
      galleryGranted: false,
    };
  }
};

export const pickImage = async (useCamera: boolean = false) => {
  const options = {
    mediaTypes: MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1] as [number, number],
    quality: 0.8,
  };

  try {
    const result = useCamera 
      ? await launchCameraAsync(options)
      : await launchImageLibraryAsync(options);

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};
