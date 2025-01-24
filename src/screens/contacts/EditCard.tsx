import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import Header from '../../components/Header';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL, ENDPOINTS, buildUrl } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditCard() {
  const navigation = useNavigation();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    occupation: '',
    company: '',
    email: '',
    phoneNumber: '',
  });
  const [selectedColor, setSelectedColor] = useState('#1B2B5B'); // Default color

  // Add this array of colors
  const cardColors = [
    '#1B2B5B', // Navy Blue
    '#E63946', // Red
    '#2A9D8F', // Teal
    '#E9C46A', // Yellow
    '#F4A261', // Orange
    '#6D597A', // Purple
    '#355070', // Dark Blue
    '#B56576', // Pink
    '#4DAA57', // Green
    '#264653', // Dark Teal
  ];

  const handleCancel = () => {
    navigation.goBack();
  };

  const validateForm = () => {
    if (!formData.company || !formData.email || !formData.phoneNumber || !formData.occupation) {
      setError('Please fill in all required fields');
      return false;
    }
    setError('');
    return true;
  };

  const handlePreview = async () => {
    try {
      if (!validateForm()) {
        return;
      }

      // Logic for previewing the card can be added here
      Alert.alert('Preview', 'This is where you would preview the card.');

    } catch (error) {
      console.error('Error previewing card:', error);
      Alert.alert('Error', 'Failed to preview card. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Edit Card" />
      
      {/* Cancel and Preview buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePreview}>
          <Text style={styles.saveButton}>Preview card</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Warning Message */}
        <View style={styles.colorSection}>
          <Text style={styles.sectionTitle}>Card color</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.colorContainer}
          >
            {cardColors.map((color, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedColor(color)}
                style={styles.colorButtonWrapper}
              >
                <View style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColor,
                ]} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Images & Layout Section */}
        <Text style={styles.sectionTitle}>Images & layout</Text>
        <View style={styles.imageButtons}>
          <TouchableOpacity style={styles.imageButton}>
            <MaterialIcons name="add" size={24} color={COLORS.black} />
            <Text style={styles.buttonText}>Profile Picture</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.imageButton}>
            <MaterialIcons name="add" size={24} color={COLORS.black} />
            <Text style={styles.buttonText}>Company logo</Text>
          </TouchableOpacity>
        </View>

        {/* Personal Details Section */}
        <Text style={styles.sectionTitle}>Personal details</Text>
        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TextInput 
            style={styles.input}
            placeholder="First name..."
            placeholderTextColor="#999"
            value={formData.firstName}
            onChangeText={(text) => setFormData({...formData, firstName: text})}
          />
          <TextInput 
            style={styles.input}
            placeholder="Occupation..."
            placeholderTextColor="#999"
            value={formData.occupation}
            onChangeText={(text) => setFormData({...formData, occupation: text})}
          />
          <TextInput 
            style={styles.input}
            placeholder="Last name..."
            placeholderTextColor="#999"
            value={formData.lastName}
            onChangeText={(text) => setFormData({...formData, lastName: text})}
          />
          <TextInput 
            style={styles.input}
            placeholder="Company name..."
            placeholderTextColor="#999"
            value={formData.company}
            onChangeText={(text) => setFormData({...formData, company: text})}
          />
          <TextInput 
            style={styles.input}
            placeholder="Email..."
            placeholderTextColor="#999"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            keyboardType="email-address"
          />
          <TextInput 
            style={styles.input}
            placeholder="Phone number..."
            placeholderTextColor="#999"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData({...formData, phoneNumber: text})}
            keyboardType="phone-pad"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 200,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    marginTop: 0,
  },
  warningText: {
    marginLeft: 8,
    color: COLORS.black,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: COLORS.black,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  imageButton: {
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buttonText: {
    color: COLORS.black,
    marginLeft: 4,
  },
  form: {
    gap: 12,
  },
  input: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    zIndex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
  },
  cancelButton: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    color: '#666',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#1E1B4B',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  colorSection: {
    marginBottom: 24,
  },
  colorContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
    flexDirection: 'row',
  },
  colorButtonWrapper: {
    padding: 3, // Space for the selection border
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
  },
  selectedColor: {
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
});
