import { ImagePickerAsset, launchCameraAsync, launchImageLibraryAsync, MediaTypeOptions, requestCameraPermissionsAsync, requestMediaLibraryPermissionsAsync } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from './api';

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

/**
 * Gets the correct image URL regardless of storage location
 * Works with both Firebase Storage URLs and local server paths
 * 
 * @param {string} imageUri - The image URI from the database
 * @returns {string|null} - The full URL to the image or null if no image
 */
export const getImageUrl = (imageUri: string | undefined | null): string | null => {
  if (!imageUri) return null;
  
  // If it's already a full URL (Firebase Storage), return as is
  if (imageUri.startsWith('http')) {
    return imageUri;
  }
  
  // Otherwise, it's a local path, prepend the API base URL
  return `${API_BASE_URL}${imageUri}`;
};
